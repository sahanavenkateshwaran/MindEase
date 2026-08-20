# MindEase - AI-Powered Mental Health Platform

MindEase is a modern, production-ready, full-stack Mental Health Assistant application built using **React (frontend)**, **FastAPI (backend)**, and **MongoDB (database)**. It leverages the **Llama 3 Large Language Model** (via the Groq API) for empathetic conversations and automated journal summarization, and combines audio/video telemetry for advanced emotion and behavior tracking.

## 🚀 Key Features

- **Empathetic Chatbot**: Llama 3 chatbot with conversational memory and dynamic emotional response adjustment.
- **Acoustic Voice Spectrography**: Librosa-based audio logs mapping pitch, energy, speaking rate, and volume to user stress states.
- **Aesthetic Face & Behavior Telemetry**: Real-time webcam analysis of blink rates, yawn counts, posture slants, looking away frequencies, and concentration/fatigue coefficients.
- **Multimodal AI Fusion**: Aggregates Text sentiment + Facial expressions + Voice metrics to determine unified emotional state.
- **Personalized Wellness Engine**: Automatically yields targeted breathing bubbles (4-4-6 timing), daily workout tasks, relaxation playlists, and reading modules.
- **Reflective Journaling**: Summarizes daily diaries using Llama, generates 3 clinical insights, and logs history.
- **Clinical Therapist Portal**: Allows therapist accounts to review patient trends, webcam logs, voice stats, and raw journal files.
- **Admin Control Panel**: Interface to view global statistics, search system users, purge accounts, and seed the relaxation video database.

---

## 📂 Project Structure

```text
project/
├── backend/
│   ├── app/
│   │   ├── models/        # Pydantic schemas (user, chat, journals, logs)
│   │   ├── routes/        # API Routers (auth, chat, voice, video, dashboard, etc.)
│   │   ├── services/      # AI engines (Llama, Librosa, MediaPipe/DeepFace trackers)
│   │   ├── config.py      # App configurations
│   │   ├── database.py    # Asynchronous MongoDB motor hook
│   │   └── main.py        # Lifespan events, pre-seeds & FastAPI start
│   ├── .env               # API keys & Database URI
│   └── requirements.txt   # Python packages
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable components (Charts, Visualizers, Sidebar, Navbar)
│   │   ├── pages/         # Page containers (Dashboard, Auth, Chat, Journal, Settings)
│   │   ├── App.jsx        # Route middleware & Auth state checks
│   │   └── main.jsx       # Mount bootstrap
│   ├── vite.config.js     # Tailwind plugin configs
│   └── package.json       # NodeJS packages
└── README.md              # Documentation
```

---

## 🛠️ Installation & Setup

### 1. MongoDB Atlas Configuration
The application is pre-configured to connect to the MongoDB Atlas database provided in your requirements.

### 2. Backend Setup (FastAPI)
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows (PowerShell/CMD):
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure credentials in the `.env` file (e.g., your `GROQ_API_KEY` for Llama-3 chatting and transcription):
   - Locate the `backend/.env` file.
   - Enter your Groq API key: `GROQ_API_KEY=gsk_your_actual_key`
5. Run the FastAPI development server:
   ```bash
   python app/main.py
   ```
   The backend API will be live at `http://localhost:8000`.

### 3. Frontend Setup (React & Vite)
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install NodeJS dependencies:
   ```bash
   npm install
   ```
3. Start the Vite local development server:
   ```bash
   npm run dev
   ```
4. Access the web interface in your browser:
   `http://localhost:3000`

---

## 🧑‍⚕️ Quick Demonstration Roles
To test different dashboards instantly without editing database documents, use the following email patterns during **Signup**:
- **Therapist View**: Sign up using an email containing `therapist` (e.g., `therapist@health.com` or `therapist1@mindease.com`). The system will auto-assign the `therapist` role, redirecting you to the Therapist Portal.
- **Admin View**: Sign up using an email containing `admin` (e.g., `admin@health.com` or `admin1@mindease.com`). The system will auto-assign the `admin` role, allowing access to the Administrative Panel.
- **Standard User**: Sign up using any standard email. You'll gain access to the wellness suite, chats, recorders, and settings.
