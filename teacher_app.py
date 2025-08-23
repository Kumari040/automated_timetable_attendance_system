import tkinter as tk
from tkinter import ttk, messagebox # For a nicer list view and pop-up messages
from PIL import Image, ImageTk
import qrcode
import requests
import time
import socketio # Import the socketio client
import threading # To run the socketio client in the background
import csv # To handle exporting the data
from datetime import datetime # To create unique filenames

SERVER_URL = "http://127.0.0.1:5000"
REFRESH_INTERVAL_MS = 4000 

class QRCodeApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Dynamic QR Code - Teacher's Dashboard")
        self.root.geometry("800x600") # Make window larger
        self.root.configure(bg="#2c3e50") # Darker background

        # Create two frames: one for QR, one for the list
        qr_frame = tk.Frame(root, bg="#2c3e50")
        qr_frame.pack(side=tk.LEFT, fill=tk.Y, padx=20, pady=20)

        list_frame = tk.Frame(root, bg="#2c3e50")
        list_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=20, pady=20)

        # --- QR Code Section ---
        self.label = tk.Label(qr_frame, text="Scan for Attendance", font=("Helvetica", 20, "bold"), fg="white", bg="#2c3e50")
        self.label.pack(pady=10)
        self.qr_label = tk.Label(qr_frame, bg="#2c3e50")
        self.qr_label.pack(pady=20)
        self.status_label = tk.Label(qr_frame, text="Fetching QR code...", font=("Helvetica", 10), fg="#bdc3c7", bg="#2c3e50")
        self.status_label.pack(pady=5)

        # --- Live Attendance List Section ---
        self.list_label = tk.Label(list_frame, text="Live Attendance", font=("Helvetica", 20, "bold"), fg="white", bg="#2c3e50")
        self.list_label.pack(pady=10)
        
        style = ttk.Style()
        style.theme_use("clam")
        style.configure("Treeview", 
                        background="#34495e", 
                        foreground="white", 
                        fieldbackground="#34495e",
                        rowheight=25,
                        font=("Helvetica", 12))
        style.map('Treeview', background=[('selected', '#2980b9')])

        self.tree = ttk.Treeview(list_frame, columns=('Student ID',), show='headings')
        self.tree.heading('Student ID', text='Student ID')
        self.tree.pack(fill=tk.BOTH, expand=True)
        self.student_count = 0

        # --- NEW: Export Button ---
        self.export_button = tk.Button(list_frame, text="Export to CSV", font=("Helvetica", 12, "bold"), 
                                       bg="#16a085", fg="white", relief="flat", padx=10, pady=5,
                                       command=self.export_to_csv)
        self.export_button.pack(pady=15)


        # --- Initialize everything ---
        self.update_qr_code()
        self.setup_socketio()

    def export_to_csv(self):
        """Saves the current list of students in the Treeview to a new CSV file."""
        if self.student_count == 0:
            messagebox.showwarning("Export Empty", "There are no students to export.")
            return

        # Create a unique filename with a timestamp
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        filename = f"attendance_export_{timestamp}.csv"

        try:
            with open(filename, 'w', newline='') as csvfile:
                writer = csv.writer(csvfile)
                # Write the header
                writer.writerow(['Student ID'])
                # Write the student data
                for child_item in self.tree.get_children():
                    student_id = self.tree.item(child_item)['values'][0]
                    writer.writerow([student_id])
            
            messagebox.showinfo("Export Successful", f"Successfully exported {self.student_count} students to:\n{filename}")
        except Exception as e:
            messagebox.showerror("Export Error", f"An error occurred while exporting:\n{e}")


    def update_qr_code(self):
        try:
            response = requests.get(f"{SERVER_URL}/get_qr_data")
            response.raise_for_status()
            data = response.json()
            token = data.get('token')
            if token:
                qr_img = qrcode.make(token)
                qr_img = qr_img.resize((350, 350))
                self.photo = ImageTk.PhotoImage(qr_img)
                self.qr_label.config(image=self.photo)
                self.status_label.config(text=f"Last updated: {time.strftime('%H:%M:%S')}", fg="#1abc9c")
        except requests.exceptions.RequestException:
            self.status_label.config(text="Error: Cannot connect to server.", fg="#e74c3c")
        self.root.after(REFRESH_INTERVAL_MS, self.update_qr_code)

    def add_student_to_list(self, student_id):
        self.student_count += 1
        self.tree.insert("", "end", values=(student_id,))
        # Update the main label with the count
        list_label_text = f"Live Attendance ({self.student_count} Present)"
        self.list_label.config(text=list_label_text)


    def setup_socketio(self):
        sio = socketio.Client()

        @sio.event
        def connect():
            print("Connected to server!")

        @sio.event
        def student_marked(data):
            student_id = data.get('student_id')
            print(f"Received update: {student_id} marked present.")
            # We need to schedule the GUI update on the main thread
            self.root.after(0, self.add_student_to_list, student_id)

        @sio.event
        def disconnect():
            print("Disconnected from server.")

        def run_client():
            sio.connect(SERVER_URL)
            sio.wait()

        # Run the client in a separate thread to not block the GUI
        client_thread = threading.Thread(target=run_client)
        client_thread.daemon = True # Allows main program to exit even if thread is running
        client_thread.start()

if __name__ == "__main__":
    root = tk.Tk()
    app = QRCodeApp(root)
    root.mainloop()
