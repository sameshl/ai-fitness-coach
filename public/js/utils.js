export function getAngleBetweenPoints(a, b, c) {
  const vectorAB = {
    x: b.x - a.x,
    y: b.y - a.y,
  };
  const vectorBC = {
    x: c.x - b.x,
    y: c.y - b.y,
  };

  const dotProduct = vectorAB.x * vectorBC.x + vectorAB.y * vectorBC.y;
  const magnitudeAB = Math.sqrt(vectorAB.x * vectorAB.x + vectorAB.y * vectorAB.y);
  const magnitudeBC = Math.sqrt(vectorBC.x * vectorBC.x + vectorBC.y * vectorBC.y);
  const angleRadians = Math.acos(dotProduct / (magnitudeAB * magnitudeBC));
  return 180 - (angleRadians * 180) / Math.PI;
}

export function updateStatus(message, statusElement) {
  const timestamp = new Date().toLocaleTimeString();
  statusElement.innerHTML += `[${timestamp}] ${message}<br>`;
  statusElement.scrollTop = statusElement.scrollHeight;
}

export async function checkCameraPermissions() {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
  } catch (err) {
    console.error('Camera permission error:', err);
    return null;
  }
} 