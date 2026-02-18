from .base import BaseAgent
from typing import Dict, Any
import subprocess
import os

class AutomationAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="AutomationAgent", description="Control system automation tasks.")

    async def process_request(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        result = {"status": "success", "agent": "AutomationAgent", "action": action}
        
        try:
            if action == "open_application":
                app_name = parameters.get("app_name")
                print(f"Attempting to open {app_name}...")
                
                # Try simple specific cases first for speed
                try:
                    if app_name.lower() in ["notepad", "calc", "calculator", "mspaint", "cmd", "explorer"]:
                        subprocess.Popen(app_name)
                        result["details"] = f"Launched {app_name}"
                    elif app_name.lower() == "chrome":
                        subprocess.Popen(["start", "chrome"], shell=True)
                        result["details"] = f"Launched {app_name}"
                    elif app_name.lower() == "vscode":
                         subprocess.Popen(["code"], shell=True)
                         result["details"] = f"Launched {app_name}"
                    else:
                        # Fallback to general start command
                        subprocess.Popen(["start", app_name], shell=True)
                        result["details"] = f"Attempted to launch {app_name}"
                except Exception as e:
                    result["status"] = "error"
                    result["error"] = f"Failed to open {app_name}: {e}"
                
            elif action == "create_folder":
                folder_name = parameters.get("folder_name")
                os.makedirs(folder_name, exist_ok=True)
                result["details"] = f"Created {folder_name}"
                
            elif action == "execute_command":
                cmd = parameters.get("command")
                # Secure this in production!
                # For local personal assistant, we allow it but log it
                print(f"Executing shell command: {cmd}")
                process = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                stdout, stderr = process.communicate()
                result["details"] = stdout if stdout else stderr

        except Exception as e:
            result["status"] = "error"
            result["error"] = str(e)
            
        return result
