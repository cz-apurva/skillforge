from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.fairgrade_routes import router as fairgrade_router

app = FastAPI(
    title="SkillForge AI - FairGrade Service",
    description="Bias-resistant, rubric-based automated grading microservice for written answers.",
    version="1.0.0",
)

# CORS middleware configuration for internal microservice communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes
app.include_router(fairgrade_router)


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint to verify that FairGrade microservice is running."""
    return {
        "status": "healthy",
        "service": "fairgrade-service",
        "version": "1.0.0",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)
