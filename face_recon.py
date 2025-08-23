import face_recognition
import cv2
import numpy as np
import os
import pickle
import random
from datetime import datetime
from scipy.spatial import distance as dist

# ====================================================================
# 1. CONSTANTS AND STATE VARIABLES
# ====================================================================

# --- Challenge Settings ---
CHALLENGE_CONFIRMATION_FRAMES = 5
CHALLENGE_TIMEOUT = 10  # seconds to complete a challenge
CHALLENGES = ["Turn Head Left", "Turn Head Right", "Smile"]
challenge_confirmation_counter = 0
CHALLENGE_GRACE_PERIOD = 0.5 # Seconds to wait before checking a challenge

# --- Detection Thresholds ---
HEAD_TURN_THRESHOLD = 0.3  # Relative nose movement
SMILE_ABSOLUTE_THRESHOLD = 0.7   # Relative increase in mouth width

# --- File Paths ---
PATH = 'student_images'
ENCODINGS_FILE = 'encodings.pkl'

# --- State Management ---
liveness_approved = False
challenge_sequence = []
current_challenge_index = -1
challenge_start_time = None
initial_face_state = None
students_marked_today = set()

# ====================================================================
# 2. HELPER FUNCTIONS
# ====================================================================

def mark_attendance(name):
    """Writes the student's name and time to a daily CSV file."""
    global students_marked_today
    if name not in students_marked_today:
        now = datetime.now()
        date_string = now.strftime('%Y-%m-%d')
        time_string = now.strftime('%H:%M:%S')
        with open(f'Attendance_{date_string}.csv', 'a', newline='') as f:
            if f.tell() == 0:
                f.write('Name,Time\n')
            f.write(f'{name},{time_string}\n')
        students_marked_today.add(name)
        print(f"Attendance marked for {name}")

def get_face_state(landmarks):
    """Calculates key metrics of a face for challenge detection."""
    state = {}
    
    # Nose position for head turn detection
    nose_tip = landmarks['nose_tip'][0]
    chin = landmarks['chin'][8]
    face_center_x = (landmarks['left_eye'][0][0] + landmarks['right_eye'][3][0]) / 2
    state['relative_nose_x'] = (nose_tip[0] - face_center_x) / (chin[0] - face_center_x + 1e-6)

    # Mouth width for smile detection
    mouth_left = landmarks['top_lip'][0]
    mouth_right = landmarks['top_lip'][6]
    mouth_width = dist.euclidean(mouth_left, mouth_right)
    
    # Normalize by face width (distance between eyes) for consistency
    left_eye_outer = landmarks['left_eye'][0]
    right_eye_outer = landmarks['right_eye'][3]
    face_width = dist.euclidean(left_eye_outer, right_eye_outer)
    state['relative_mouth_width'] = mouth_width / face_width
    
    return state

# ====================================================================
# 3. LOAD KNOWN FACES (OPTIMIZED)
# ====================================================================

classNames = []
known_face_encodings = []

try:
    with open(ENCODINGS_FILE, 'rb') as f:
        known_face_encodings, classNames = pickle.load(f)
    print("Loaded encodings from file.")
except FileNotFoundError:
    print("Encodings file not found. Computing from images...")
    student_folders = os.listdir(PATH)
    for student_name in student_folders:
        student_path = os.path.join(PATH, student_name)
        if not os.path.isdir(student_path): continue
        for img_file in os.listdir(student_path):
            image_path = os.path.join(student_path, img_file)
            img = cv2.imread(image_path)
            if img is None: continue
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            try:
                encode = face_recognition.face_encodings(img_rgb)[0]
                known_face_encodings.append(encode)
                classNames.append(student_name)
            except IndexError:
                print(f"Warning: No face found in {student_name}/{img_file}. Skipping.")
    with open(ENCODINGS_FILE, 'wb') as f:
        pickle.dump((known_face_encodings, classNames), f)
    print("Saved new encodings to file.")
print(f'Found {len(known_face_encodings)} known faces. Encoding complete.')

# ====================================================================
# 4. INITIALIZE WEBCAM AND MAIN LOOP
# ====================================================================

cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("Error: Could not open video stream.")
    exit()

while True:
    success, img = cap.read()
    if not success:
        print("Failed to grab frame")
        break

    imgS = cv2.resize(img, (0, 0), None, 0.25, 0.25)
    imgS = cv2.cvtColor(imgS, cv2.COLOR_BGR2RGB)

    faces_in_frame = face_recognition.face_locations(imgS)
    face_landmarks_list = face_recognition.face_landmarks(imgS, faces_in_frame)

    if not faces_in_frame:
        liveness_approved = False
        challenge_sequence = []
        current_challenge_index = -1
        challenge_start_time = None

    # --- LIVENESS CHALLENGE LOGIC ---
    if not liveness_approved:
        if faces_in_frame and not challenge_sequence:
            challenge_sequence = random.sample(CHALLENGES, 2)
            current_challenge_index = 0
            challenge_start_time = datetime.now()
            initial_face_state = get_face_state(face_landmarks_list[0])
            print(f"Starting challenges: {challenge_sequence}")

        if challenge_sequence:
            current_challenge = challenge_sequence[current_challenge_index]
            cv2.putText(img, f"Challenge: {current_challenge}", (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 0, 255), 2)

            elapsed_time = (datetime.now() - challenge_start_time).total_seconds()
            
            # --- START OF CORRECTED BLOCK ---
            # All the logic for checking is now INSIDE this if statement
            if elapsed_time > CHALLENGE_GRACE_PERIOD:
                current_face_state = get_face_state(face_landmarks_list[0])
                challenge_passed = False
                condition_met = False

                if current_challenge == "Turn Head Left":
                    if current_face_state['relative_nose_x'] < initial_face_state['relative_nose_x'] - HEAD_TURN_THRESHOLD:
                        condition_met = True
                elif current_challenge == "Turn Head Right":
                    if current_face_state['relative_nose_x'] > initial_face_state['relative_nose_x'] + HEAD_TURN_THRESHOLD:
                        condition_met = True
                elif current_challenge == "Smile":
                    if current_face_state['relative_mouth_width'] > SMILE_ABSOLUTE_THRESHOLD:
                        condition_met = True
                
                if condition_met:
                    challenge_confirmation_counter += 1
                else:
                    challenge_confirmation_counter = 0

                if challenge_confirmation_counter >= CHALLENGE_CONFIRMATION_FRAMES:
                    challenge_passed = True
            
                if challenge_passed:
                    print(f"Passed: {current_challenge}")
                    current_challenge_index += 1
                    if current_challenge_index >= len(challenge_sequence):
                        liveness_approved = True
                        print("Liveness Approved!")
                    else:
                        challenge_start_time = datetime.now()
                        initial_face_state = get_face_state(face_landmarks_list[0])
                        challenge_confirmation_counter = 0

            # This timeout check is now an elif
            elif elapsed_time > CHALLENGE_TIMEOUT:
                print("Challenge timed out. Resetting.")
                challenge_sequence = []
            # --- END OF CORRECTED BLOCK ---

    # --- RECOGNITION LOGIC ---
    else:
        cv2.putText(img, "Liveness Approved", (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 255, 0), 2)
        encodes_in_frame = face_recognition.face_encodings(imgS, faces_in_frame)
        for encodeFace, faceLoc in zip(encodes_in_frame, faces_in_frame):
            matches = face_recognition.compare_faces(known_face_encodings, encodeFace, tolerance=0.50)
            faceDis = face_recognition.face_distance(known_face_encodings, encodeFace)
            if len(faceDis) > 0:
                matchIndex = np.argmin(faceDis)
                name = "Disapproved"
                color = (0, 0, 255)
                if matches[matchIndex]:
                    name = classNames[matchIndex].upper()
                    color = (0, 255, 0)
                    mark_attendance(name)
                y1, x2, y2, x1 = faceLoc
                y1, x2, y2, x1 = y1 * 4, x2 * 4, y2 * 4, x1 * 4
                cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
                cv2.rectangle(img, (x1, y2 - 35), (x2, y2), color, cv2.FILLED)
                cv2.putText(img, name, (x1 + 6, y2 - 6), cv2.FONT_HERSHEY_COMPLEX, 1, (255, 255, 255), 2)

    cv2.imshow('Webcam', img)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# ====================================================================
# 5. CLEANUP
# ====================================================================
cap.release()
cv2.destroyAllWindows()