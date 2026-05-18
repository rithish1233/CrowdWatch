"""
CrowdWatch ML Service — FastAPI + YOLOv8 Person Detection
Run: uvicorn main:app --reload --port 8000
"""

import time
import cv2
import numpy as np
import requests
from io import BytesIO
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ultralytics import YOLO
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="CrowdWatch ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load YOLOv8 model once at startup
logger.info("Loading YOLOv8 model...")
model = YOLO("yolov8n.pt")  # nano model — fast inference
# Use yolov8m.pt or yolov8l.pt for better accuracy at cost of speed
logger.info("YOLOv8 model loaded ✅")

PERSON_CLASS_ID = 0  # YOLO class 0 = person
CONFIDENCE_THRESHOLD = 0.4


class AnalyzeRequest(BaseModel):
    media_url: str
    media_type: str = "image"  # image | video | stream


class Detection(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float
    confidence: float
    class_name: str


class AnalyzeResponse(BaseModel):
    person_count: int
    detections: list
    avg_confidence: Optional[float]
    processing_time_ms: float
    frame_count: int
    error: Optional[str] = None


def fetch_image_from_url(url: str) -> np.ndarray:
    """Download image from URL and convert to OpenCV format."""
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    img_array = np.frombuffer(response.content, np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image from URL")
    return img


def run_yolo_on_frame(frame: np.ndarray) -> tuple:
    """Run YOLO on a single frame, return (count, detections, avg_conf)."""
    results = model(frame, conf=CONFIDENCE_THRESHOLD, classes=[PERSON_CLASS_ID], verbose=False)
    
    detections = []
    confidences = []

    for result in results:
        boxes = result.boxes
        if boxes is None:
            continue
        for box in boxes:
            cls = int(box.cls[0])
            if cls != PERSON_CLASS_ID:
                continue
            conf = float(box.conf[0])
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            detections.append({
                "x1": round(x1, 2),
                "y1": round(y1, 2),
                "x2": round(x2, 2),
                "y2": round(y2, 2),
                "confidence": round(conf, 3),
                "class_name": "person",
            })
            confidences.append(conf)

    avg_conf = round(sum(confidences) / len(confidences), 3) if confidences else None
    return len(detections), detections, avg_conf


def analyze_image(url: str) -> dict:
    """Analyze a single image URL."""
    frame = fetch_image_from_url(url)
    count, detections, avg_conf = run_yolo_on_frame(frame)
    return {
        "person_count": count,
        "detections": detections,
        "avg_confidence": avg_conf,
        "frame_count": 1,
    }


def analyze_video(url: str, max_frames: int = 10) -> dict:
    """
    Analyze a video URL — sample frames and average the person count.
    We sample up to max_frames evenly distributed across the video.
    """
    cap = cv2.VideoCapture(url)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {url}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    
    # Sample frame indices
    if total_frames <= max_frames:
        sample_indices = list(range(total_frames))
    else:
        step = total_frames // max_frames
        sample_indices = [i * step for i in range(max_frames)]

    all_counts = []
    all_detections = []
    all_confs = []

    for idx in sample_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if not ret:
            continue
        count, dets, avg_conf = run_yolo_on_frame(frame)
        all_counts.append(count)
        all_detections.extend(dets)
        if avg_conf:
            all_confs.append(avg_conf)

    cap.release()

    avg_count = round(sum(all_counts) / len(all_counts)) if all_counts else 0
    peak_count = max(all_counts) if all_counts else 0
    # Use the 80th percentile to avoid outliers
    sorted_counts = sorted(all_counts)
    p80_idx = int(len(sorted_counts) * 0.8)
    representative_count = sorted_counts[p80_idx] if sorted_counts else 0

    return {
        "person_count": representative_count,
        "avg_person_count": avg_count,
        "peak_person_count": peak_count,
        "detections": all_detections[:50],  # cap payload size
        "avg_confidence": round(sum(all_confs) / len(all_confs), 3) if all_confs else None,
        "frame_count": len(all_counts),
    }


def analyze_stream(url: str) -> dict:
    """Grab a single frame from a live stream (RTSP, HTTP stream)."""
    cap = cv2.VideoCapture(url)
    if not cap.isOpened():
        raise ValueError(f"Cannot open stream: {url}")

    # Try to grab a stable frame (skip first few)
    for _ in range(5):
        cap.read()

    ret, frame = cap.read()
    cap.release()

    if not ret or frame is None:
        raise ValueError("Could not grab frame from stream")

    count, detections, avg_conf = run_yolo_on_frame(frame)
    return {
        "person_count": count,
        "detections": detections,
        "avg_confidence": avg_conf,
        "frame_count": 1,
    }


@app.get("/")
def root():
    return {"status": "CrowdWatch ML Service running", "model": "YOLOv8"}


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest):
    start = time.time()
    logger.info(f"Analyzing {request.media_type}: {request.media_url[:80]}...")

    try:
        if request.media_type == "image":
            result = analyze_image(request.media_url)
        elif request.media_type == "video":
            result = analyze_video(request.media_url)
        elif request.media_type == "stream":
            result = analyze_stream(request.media_url)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown media_type: {request.media_type}")

        elapsed = round((time.time() - start) * 1000, 2)
        logger.info(f"Done: {result['person_count']} persons in {elapsed}ms")

        return {
            **result,
            "processing_time_ms": elapsed,
        }

    except Exception as e:
        elapsed = round((time.time() - start) * 1000, 2)
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Webcam endpoint — for local webcam testing (index-based)
@app.post("/analyze/webcam")
def analyze_webcam(camera_index: int = 0):
    start = time.time()
    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        raise HTTPException(status_code=400, detail=f"Cannot open camera {camera_index}")

    for _ in range(3):
        cap.read()
    ret, frame = cap.read()
    cap.release()

    if not ret:
        raise HTTPException(status_code=500, detail="Could not capture frame")

    count, detections, avg_conf = run_yolo_on_frame(frame)
    elapsed = round((time.time() - start) * 1000, 2)

    return {
        "person_count": count,
        "detections": detections,
        "avg_confidence": avg_conf,
        "frame_count": 1,
        "processing_time_ms": elapsed,
    }
