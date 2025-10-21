from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import uuid
import os
import tempfile

app = FastAPI()

# CORS for your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "YouTube Video Generator is running!"}

@app.post("/generate-video")
async def generate_video(
    audio: UploadFile = File(...),
    text: str = Form(...),
    book_title: str = Form(...),
    chapter_title: str = Form(...),
    author: str = Form(...)
):
    """
    Generate YouTube video from audio + text
    
    Args:
        audio: Audio file (MP3/M4A) from Full-Cast TTS
        text: Chapter text to display
        book_title: Book name
        chapter_title: Chapter name
        author: Author name
    
    Returns:
        MP4 video file
    """
    
    print(f"Generating video for: {chapter_title}")
    print(f"Text length: {len(text)} characters")
    print(f"Audio file: {audio.filename}, size: {audio.size} bytes")
    
    # For now, just return a test response
    # TODO: Implement actual video generation once MoviePy is working
    
    return {
        "status": "success",
        "message": "Video generation endpoint is working!",
        "details": {
            "book_title": book_title,
            "chapter_title": chapter_title,
            "author": author,
            "text_length": len(text),
            "audio_filename": audio.filename,
            "audio_size": audio.size
        }
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting YouTube Video Generator...")
    print("API docs available at: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)
