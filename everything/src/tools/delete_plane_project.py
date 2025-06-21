import json
import requests
import os

def delete_plane_project(params_json: str = "{}") -> str:
    """
    Delete a project from the Plane project management system.
    
    Args:
        params_json: A JSON string containing project details:
            {
                "project_id": "uuid-of-project",
                "confirm": true  # Optional: set to true to confirm deletion
            }
    
    Returns:
        str: Success message or error message
    
    Example:
        >>> delete_plane_project('{"project_id": "123", "confirm": true}')
        "Project deleted successfully"
    """
    try:
        # Parse parameters
        try:
            params = json.loads(params_json) if params_json else {}
        except json.JSONDecodeError:
            return "Error: Invalid JSON parameters"
        
        # Validate required parameters
        if not params.get("project_id"):
            return "Error: Project ID is required"
        
        # Check confirmation
        if not params.get("confirm"):
            return "Error: Please confirm deletion by setting 'confirm': true"
        
        # Configuration
        API_KEY = os.environ.get("PLANE_API_KEY", "plane_api_614f7240a5df4177840558c34bddb668")
        BASE_URL = os.environ.get("PLANE_BASE_URL", "http://192.168.50.90/api/v1")
        WORKSPACE_SLUG = os.environ.get("PLANE_WORKSPACE_SLUG", "test-space")
        
        headers = {
            "X-API-Key": API_KEY,
            "Content-Type": "application/json"
        }
        
        # First get project details to confirm it exists and show what's being deleted
        project_url = f"{BASE_URL}/workspaces/{WORKSPACE_SLUG}/projects/{params['project_id']}/"
        project_response = requests.get(project_url, headers=headers)
        
        if project_response.status_code != 200:
            return f"Error: Project not found or access denied (Status code: {project_response.status_code})"
        
        project = project_response.json()
        project_name = project.get('name', 'Unknown Project')
        project_identifier = project.get('identifier', 'Unknown')
        
        # Delete the project
        response = requests.delete(project_url, headers=headers)
        
        if response.status_code == 204:  # Standard success code for DELETE
            return f"Project deleted successfully: {project_name} ({project_identifier})"
        elif response.status_code == 404:
            return "Error: Project not found"
        elif response.status_code == 403:
            return "Error: Permission denied to delete project"
        else:
            return f"Error: Failed to delete project (Status code: {response.status_code})"
    
    except requests.RequestException as e:
        return f"Error: Network error - {str(e)}"
    except Exception as e:
        return f"Error: Unexpected error - {str(e)}"
