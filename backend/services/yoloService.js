const fetch = require('node-fetch');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

const analyzeWithYOLO = async (mediaUrl, type = 'image') => {
  try {
    const response = await fetch(`${ML_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ media_url: mediaUrl, media_type: type }),
      timeout: 60000,
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`ML service error ${response.status}: ${errText}`);
    }
    const result = await response.json();
    console.log(`YOLO result: ${result.person_count} persons detected (${type})`);
    return result;
  } catch (err) {
    console.error('YOLO service unavailable:', err.message);
    return { person_count: 0, detections: [], avg_confidence: null, error: err.message, fallback: true };
  }
};

const analyzeWebcam = async (cameraIndex = 0) => {
  try {
    const response = await fetch(
      `${ML_URL}/analyze/webcam?camera_index=${cameraIndex}`,
      { method: 'POST', timeout: 30000 }
    );
    if (!response.ok) throw new Error(`ML error: ${response.status}`);
    const result = await response.json();
    console.log(`Webcam YOLO: ${result.person_count} persons`);
    return result;
  } catch (err) {
    console.error('Webcam YOLO error:', err.message);
    return { person_count: 0, detections: [], fallback: true };
  }
};

module.exports = { analyzeWithYOLO, analyzeWebcam };
