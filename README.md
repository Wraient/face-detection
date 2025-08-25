# Face Detection System

A modern, web-based face detection and recognition system built with JavaScript and Face-API.js. This system can detect faces in real-time, recognize known individuals, and display facial expressions with confidence levels.

## Features

### Core Functionality
- **Real-time Face Detection**: Detects faces in the camera feed with bounding boxes and corner markers
- **Face Recognition**: Recognizes known individuals from a local database
- **Expression Detection**: Shows the dominant facial expression (happy, sad, angry, surprised, etc.)
- **Confidence Display**: Shows system confidence levels for recognition and detection

### User Interface
- **Modern UI**: Clean, responsive design with gradient backgrounds and smooth animations
- **Status Display**: Green status box shows "Known Person Name" or "Unknown" 
- **Camera Controls**: Toggle camera on/off functionality
- **Settings Panel**: Adjust recognition confidence threshold and toggle features

### Database Management
- **Add New Faces**: Capture and save unknown faces to the database with names
- **Local Storage**: All face data is stored locally in the browser
- **Database Management**: Clear all stored face data when needed

## Setup Instructions

### Prerequisites
- Modern web browser with camera access support
- HTTPS connection (required for camera access)

### Installation
1. Clone or download this project to your local machine
2. Serve the files using a local web server (required for camera access)

#### Option 1: Using Python
```bash
# For Python 3
python -m http.server 8000

# For Python 2
python -m SimpleHTTPServer 8000
```

#### Option 2: Using Node.js
```bash
npm install -g http-server
http-server
```

#### Option 3: Using PHP
```bash
php -S localhost:8000
```

3. Open your browser and navigate to `http://localhost:8000`
4. Allow camera permissions when prompted

## How to Use

### Initial Setup
1. **Camera Access**: Grant camera permissions when prompted
2. **Model Loading**: Wait for the face detection models to load (shown with loading screen)
3. **Position Yourself**: Ensure your face is clearly visible in the camera frame

### Adding New Faces
1. **Position Unknown Person**: Have the person position their face in the camera
2. **Click "Add New Face"**: The system will capture the current face detection
3. **Enter Name**: Type the person's name in the modal dialog
4. **Save**: Click "Save Face" to add them to the database

### Recognition Process
- **Known Faces**: Shows the person's name in a green status box
- **Unknown Faces**: Shows "Unknown" in an orange status box
- **No Face**: Shows "No face detected" when no face is visible

### Settings
- **Recognition Confidence**: Adjust how strict the recognition system is (0.3 = lenient, 0.9 = strict)
- **Show Expressions**: Toggle facial expression detection on/off
- **Clear Database**: Remove all stored face data

### Information Display
- **Expression**: Shows the dominant facial expression detected
- **Confidence**: Shows the system's confidence level as a percentage

## Technical Details

### Libraries Used
- **Face-API.js**: Main face detection and recognition library
- **Font Awesome**: Icons for the user interface
- **Google Fonts (Inter)**: Modern typography

### Models Loaded
- SSD MobileNet v1: Face detection
- Face Landmark 68 Point: Facial landmark detection
- Face Recognition Net: Face descriptor extraction
- Face Expression Net: Emotion/expression detection

### Browser Compatibility
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

### Storage
- Face data is stored in browser's localStorage
- Face descriptors are saved as 128-dimensional vectors
- No data is sent to external servers

## Troubleshooting

### Camera Issues
- **Camera not working**: Ensure you're accessing via HTTPS or localhost
- **Permissions denied**: Check browser settings and allow camera access
- **No video feed**: Try refreshing the page and granting permissions again

### Performance Issues
- **Slow detection**: Close other browser tabs and applications
- **High CPU usage**: This is normal for real-time face detection
- **Memory issues**: Clear the face database if it becomes too large

### Recognition Issues
- **Poor recognition**: Adjust confidence threshold in settings
- **False positives**: Increase confidence threshold
- **Not recognizing**: Ensure good lighting and face is clearly visible when adding

## Privacy & Security

- All face data is stored locally in your browser
- No images or face data is transmitted to external servers
- Face database can be cleared at any time
- Camera feed is not recorded or saved

## Browser Requirements

- WebRTC support for camera access
- Canvas API support for image processing
- ES6+ JavaScript support
- localStorage support for data persistence

## File Structure

```
/
├── index.html          # Main HTML structure
├── style.css          # CSS styles and responsive design
├── script.js          # JavaScript functionality
└── README.md          # This file
```

## Customization

### Styling
- Modify `style.css` to change colors, fonts, and layout
- CSS custom properties can be adjusted for quick theme changes

### Functionality
- Adjust detection parameters in `script.js`
- Modify confidence thresholds and model settings
- Add new features or modify existing ones

## Support

For issues or questions:
1. Check browser console for error messages
2. Ensure camera permissions are granted
3. Try different browsers if issues persist
4. Clear browser cache and localStorage if needed

## License

This project is open source and available under the MIT License.
