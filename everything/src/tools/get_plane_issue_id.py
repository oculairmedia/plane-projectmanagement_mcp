import json
import requests
import os
import re

def get_plane_issue_id(params_json: str = "{}") -> str:
    """
    Get the UUID of a Plane issue using its display code (e.g. 'CLT-37').
    
    Args:
        params_json: A JSON string containing:
            {
                "issue_code": "PROJECT_CODE-NUMBER"  # e.g. "CLT-37"
            }
    
    Returns:
        str: Issue UUID if found, or error message
    
    Example:
        >>> get_plane_issue_id('{"issue_code": "CLT-37"}')
        "550e8400-e29b-41d4-a716-446655440000"
    """
    try:
        # Parse parameters
        try:
            params = json.loads(params_json) if params_json else {}
        except json.JSONDecodeError:
            return "Error: Invalid JSON parameters"
        
        # Validate parameters
        if not params.get("issue_code"):
            return "Error: Issue code is required"
        
        issue_code = params["issue_code"]
        
        # Parse issue code format (e.g. "CLT-37")
        match = re.match(r"([A-Za-z]+)-(\d+)", issue_code)
        if not match:
            return "Error: Invalid issue code format. Expected format: PROJECT_CODE-NUMBER (e.g. CLT-37)"
        
        project_code = match.group(1)
        sequence_id = int(match.group(2))
        
        # Configuration
        API_KEY = os.environ.get("PLANE_API_KEY", "plane_api_614f7240a5df4177840558c34bddb668")
        BASE_URL = os.environ.get("PLANE_BASE_URL", "http://192.168.50.90/api/v1")
        WORKSPACE_SLUG = os.environ.get("PLANE_WORKSPACE_SLUG", "test-space")
        
        headers = {
            "X-API-Key": API_KEY,
            "Content-Type": "application/json"
        }
        
        # First get projects to find the one matching the code
        projects_url = f"{BASE_URL}/workspaces/{WORKSPACE_SLUG}/projects"
        projects_response = requests.get(projects_url, headers=headers)
        
        if projects_response.status_code != 200:
            return f"Error: Failed to get projects - {projects_response.status_code}"
        
        projects = projects_response.json()
        project = None
        
        # Find project with matching identifier
        for p in projects:
            if p.get("identifier", "").upper() == project_code.upper():
                project = p
                break
        
        if not project:
            return f"Error: No project found with identifier {project_code}"
        
        # Get issues for the project
        issues_url = f"{BASE_URL}/workspaces/{WORKSPACE_SLUG}/projects/{project['id']}/issues/"
        issues_response = requests.get(issues_url, headers=headers)
        
        if issues_response.status_code != 200:
            return f"Error: Failed to get issues - {issues_response.status_code}"
        
        issues = issues_response.json()
        
        # Find issue with matching sequence_id
        for issue in issues:
            if issue.get("sequence_id") == sequence_id:
                return json.dumps({
                    "issue_id": issue["id"],
                    "project_id": project["id"],
                    "name": issue["name"],
                    "current_state": issue.get("state")
                })
        
        return f"Error: No issue found with sequence ID {sequence_id} in project {project_code}"
    
    except requests.RequestException as e:
        return f"Error: Network error - {str(e)}"
    except Exception as e:
        return f"Error: Unexpected error - {str(e)}"