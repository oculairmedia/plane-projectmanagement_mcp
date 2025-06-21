import json
import requests
import os

def list_plane_projects(params_json: str = "{}") -> str:
    """
    List projects in the Plane project management system.
    
    Args:
        params_json: A JSON string (not used in this version, kept for consistency)
    
    Returns:
        str: A list of project names or an error message
    
    Example:
        >>> list_plane_projects()
        "Projects: Project1, Project2"
    """
    try:
        # Configuration
        API_KEY = os.environ.get("PLANE_API_KEY", "plane_api_614f7240a5df4177840558c34bddb668")
        BASE_URL = os.environ.get("PLANE_BASE_URL", "http://192.168.50.90/api/v1")
        WORKSPACE_SLUG = os.environ.get("PLANE_WORKSPACE_SLUG", "test-space")
        
        headers = {
            "X-API-Key": API_KEY,
            "Content-Type": "application/json"
        }
        
        url = f"{BASE_URL}/workspaces/{WORKSPACE_SLUG}/projects/"
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            projects = response.json().get("results", [])
            project_info = [f"{p['name']} (ID: {p['id']})" for p in projects]
            return "Projects:\n" + "\n".join(project_info)
        return f"Error: API request failed with status code {response.status_code}"
    
    except requests.RequestException as e:
        return f"Error: Network error - {str(e)}"
    except Exception as e:
        return f"Error: Unexpected error - {str(e)}"

if __name__ == "__main__":
    print(list_plane_projects())
