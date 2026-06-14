from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .parser import parse_torque_xml
from .validators.base import ValidationResult
from .validators.registry import run_all_validators
from .database import init_db, save_upload_result, get_upload_history

app = FastAPI(title="Torque Spec Validator")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Initialize database when the app starts.
init_db()

@app.post("/api/upload")
async def upload_file(file: UploadFile):
    if not file.filename or not file.filename.endswith(".xml"):
        raise HTTPException(400, "Only XML files are accepted")

    content = await file.read()
    try:
        document = parse_torque_xml(content, file.filename)
    except Exception as e:
        raise HTTPException(400, f"Failed to parse XML: {e}")

    validations = run_all_validators(document)

    # Save the result to the database
    upload_id = save_upload_result(
        filename=file.filename,
        document_date=document.document_date,
        validations=validations
    )

    return {
        "upload_id": upload_id, # Return the upload ID for the frontend to use when requesting history.
        "filename": file.filename,
        "document_date": document.document_date,
        "notes": document.notes,
        "addresses": [
            {
                "code": a.code,
                "torque": a.torque,
                "notes": a.notes,
                "start_date": a.start_date,
                "end_date": a.end_date,
            }
            for a in document.addresses
        ],
        "validations": [v.model_dump() for v in validations],
    }

# Add endpoint to get upload history.
@app.get("/api/history")
def get_history():
    return get_upload_history()
