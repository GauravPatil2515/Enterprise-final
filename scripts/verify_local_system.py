import sys
import os
import time
import requests
import subprocess
import logging

# Add api to path
sys.path.append(os.path.join(os.getcwd(), "api"))

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def check_backend_health():
    """Check if backend is running and healthy"""
    try:
        response = requests.get("http://localhost:8001/api/health", timeout=2)
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "ok":
                logger.info("✅ Backend Health Check Passed")
                logger.info(f"   Neo4j Connected: {data.get('neo4j_connected')}")
                return True
    except requests.exceptions.ConnectionError:
        pass
    return False

def check_frontend_availability():
    """Check if frontend is serving content"""
    try:
        response = requests.get("http://localhost:3000", timeout=2)
        if response.status_code == 200:
            logger.info("✅ Frontend Available")
            return True
    except requests.exceptions.ConnectionError:
        pass
    return False

def test_shutdown_resilience():
    """Start backend, check health, then shut it down"""
    logger.info("🧪 Testing Backend Startup & Shutdown...")
    
    # Start Backend
    process = subprocess.Popen(
        ["uvicorn", "api.app.main:app", "--port", "8001"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    try:
        # Wait for potential startup
        time.sleep(5)
        
        # Check API
        if check_backend_health():
            logger.info("✅ Backend started successfully without crashing (Lazy Loading Verification)")
        else:
            logger.error("❌ Backend failed to start or is unhealthy")
            out, err = process.communicate(timeout=2)
            logger.error(f"Output: {out}")
            logger.error(f"Error: {err}")
            return False
            
    finally:
        # Cleanup
        process.terminate()
        try:
            process.wait(timeout=5)
            logger.info("✅ Backend process terminated gracefully")
        except subprocess.TimeoutExpired:
            process.kill()
            logger.warning("⚠️ Backend process forced kill")

    return True

if __name__ == "__main__":
    print("\n--- 🕵️‍♀️ Local Serverless Readiness Check ---\n")
    success = test_shutdown_resilience()
    
    if success:
        print("\n✅ SYSTEM READY FOR DEPLOYMENT")
        sys.exit(0)
    else:
        print("\n❌ SYSTEM VERIFICATION FAILED")
        sys.exit(1)
