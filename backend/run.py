import sys
from pathlib import Path
import uvicorn

# Ensure backend directory is in sys.path for consistent module imports
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

if __name__ == "__main__":
    print("Starting Kshema Backend Server on http://127.0.0.1:8010 ...")
    try:
        uvicorn.run("app.main:app", host="127.0.0.1", port=8010, reload=True)
    except OSError as err:
        if "10048" in str(err) or "already in use" in str(err).lower() or err.errno == 10048:
            print("\n==================================================================")
            print("[Kshema BACKEND NOTICE] Port 8010 is already occupied by an active process.")
            print("The existing Kshema Backend server is already running and ready on http://127.0.0.1:8010.")
            print("No secondary Uvicorn startup is needed.")
            print("==================================================================\n")
            sys.exit(0)
        else:
            raise err


