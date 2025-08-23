import cv2
from pyzbar.pyzbar import decode, ZBarSymbol # Import ZBarSymbol
import requests
import time

# The address of the server
SERVER_URL = "http://127.0.0.1:5000"
# Cooldown in seconds to prevent spamming the server after a successful scan
SCAN_COOLDOWN = 10

def mark_attendance(token, student_id):
    """
    Sends the scanned token and student ID to the server.
    """
    try:
        payload = {'token': token, 'student_id': student_id}
        response = requests.post(f"{SERVER_URL}/mark_attendance", json=payload)
        
        # Print the server's response
        response_data = response.json()
        print(f"Server Response: [{response_data.get('status')}] - {response_data.get('message')}")
        return response_data.get('status') in ['success', 'already_marked']
        
    except requests.exceptions.RequestException as e:
        print(f"Error: Could not connect to the server. {e}")
        return False

def main():
    # Get the student's ID before starting the scanner
    student_id = input("Please enter your Student ID: ")
    if not student_id:
        print("Student ID cannot be empty. Exiting.")
        return

    # Initialize the webcam
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not open webcam.")
        return
        
    print("\nWebcam opened. Point it at the QR code.")
    print("Press 'q' to quit.")
    
    last_scan_time = 0

    while True:
        # Read a frame from the webcam
        success, frame = cap.read()
        if not success:
            print("Failed to capture frame.")
            break

        # Decode ONLY QR codes from the frame to prevent warnings
        decoded_objects = decode(frame, symbols=[ZBarSymbol.QRCODE])
        
        current_time = time.time()
        
        # Process any found QR codes
        for obj in decoded_objects:
            # Check if we are outside the cooldown period
            if current_time - last_scan_time > SCAN_COOLDOWN:
                token = obj.data.decode('utf-8')
                print(f"\nQR Code detected! Data: {token}")
                
                # Try to mark attendance
                if mark_attendance(token, student_id):
                    print("You can now close this window.")
                    # Attendance marked successfully, so we can exit
                    cap.release()
                    cv2.destroyAllWindows()
                    return
                else:
                    print("Retrying... Please hold the QR code steady.")
                
                # Update the last scan time to start the cooldown
                last_scan_time = current_time

        # Display the webcam feed
        cv2.imshow("QR Code Scanner", frame)

        # Check for 'q' key press to exit
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # Clean up
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
