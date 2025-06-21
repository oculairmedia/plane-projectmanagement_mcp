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

def update_plane_issue(params_json: str = "{}") -> str:
    """
    Update an existing issue in a Plane project.
    
    Args:
        params_json: A JSON string containing update details:
            {
                "project_id": "uuid-of-project",
                "issue_id": "uuid-of-issue",
                "state_id": "uuid-of-state",  # Optional
                "name": "New title",  # Optional
                "description": "New description",  # Optional
                "priority": "none|low|medium|high|urgent",  # Optional
                "assignee_ids": ["user-uuid"],  # Optional
                "label_ids": ["label-uuid"],  # Optional
                "start_date": "YYYY-MM-DD",  # Optional
                "target_date": "YYYY-MM-DD"  # Optional
            }
    
    Returns:
        str: Success message with updated issue details or error message
    
    Example:
        >>> update_plane_issue('{"project_id": "123", "issue_id": "456", "state_id": "789"}')
        "Issue updated: Bug Fix (#123) - Status changed"
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
        if not params.get("issue_id"):
            return "Error: Issue ID is required"
        
        # Check if issue_id is a UUID, if not, try to resolve it
        issue_id = params["issue_id"]
        if not re.match(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", issue_id):
            # Try to resolve the issue ID
            issue_resolution_params = json.dumps({"issue_code": issue_id})
            resolution_result = get_plane_issue_id(issue_resolution_params)
            try:
                resolution_data = json.loads(resolution_result)
                if "issue_id" in resolution_data:
                    params["issue_id"] = resolution_data["issue_id"]
                    params["project_id"] = resolution_data["project_id"]
                else:
                    return f"Error: Could not resolve issue code {issue_id} to a UUID.  Details: {resolution_result}"
            except json.JSONDecodeError:
                return f"Error: Could not resolve issue code {issue_id} to a UUID.  Details: {resolution_result}"

        # Configuration
        API_KEY = os.environ.get("PLANE_API_KEY", "plane_api_614f7240a5df4177840558c34bddb668")
        BASE_URL = os.environ.get("PLANE_BASE_URL", "http://192.168.50.90/api/v1")
        WORKSPACE_SLUG = os.environ.get("PLANE_WORKSPACE_SLUG", "test-space")
        
        headers = {
            "X-API-Key": API_KEY,
            "Content-Type": "application/json"
        }
        
        # Remove required fields from update data
        update_data = params.copy()
        update_data.pop("project_id")
        update_data.pop("issue_id")
        
        # If description is updated, also update HTML version
        if "description" in update_data:
            update_data["description_html"] = f"<p>{update_data['description']}</p>"
        
        if not update_data:
            return "Error: No update parameters provided"
        
        url = f"{BASE_URL}/workspaces/{WORKSPACE_SLUG}/projects/{params['project_id']}/issues/{params['issue_id']}/"
        response = requests.patch(url, headers=headers, json=update_data)
        
        if response.status_code == 200:
            result = response.json()
            changes = []
            if "state_id" in update_data:
                changes.append("status changed")
            if "name" in update_data:
                changes.append("title updated")
            if "description" in update_data:
                changes.append("description updated")
            if "priority" in update_data:
                changes.append(f"priority set to {update_data['priority']}")
            if "assignee_ids" in update_data:
                changes.append("assignees updated")
            
            change_text = " - " + ", ".join(changes) if changes else ""
            return f"Issue updated: {result['name']} (#{result['sequence_id']}){change_text}"
        return f"Error: API request failed with status code {response.status_code}"
    
    except requests.RequestException as e:
        return f"Error: Network error - {str(e)}"
    except Exception as e:
        return f"Error: Unexpected error - {str(e)}"
