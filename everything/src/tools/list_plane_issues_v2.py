import json
import requests
import os

def list_plane_issues(params_json: str = "{}") -> str:
    """
    List issues in a Plane project with optional filtering.
    
    Args:
        params_json: A JSON string containing filter options:
            {
                "project_id": "uuid-of-project",
                "state_id": "uuid-of-state",  # Optional: filter by state
                "priority": "none|low|medium|high|urgent",  # Optional: filter by priority
                "assignee_id": "user-uuid",  # Optional: filter by assignee
                "label_id": "label-uuid"  # Optional: filter by label
            }
    
    Returns:
        str: List of issues with their details or error message
    
    Example:
        >>> list_plane_issues('{"project_id": "123", "priority": "high"}')
        "Issues in Project X:
         1. Bug Fix (#123) - High Priority - In Progress
         2. Feature Request (#124) - High Priority - Todo"
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
        
        # Configuration
        API_KEY = os.environ.get("PLANE_API_KEY", "plane_api_614f7240a5df4177840558c34bddb668")
        BASE_URL = os.environ.get("PLANE_BASE_URL", "http://192.168.50.90/api/v1")
        WORKSPACE_SLUG = os.environ.get("PLANE_WORKSPACE_SLUG", "test-space")
        
        headers = {
            "X-API-Key": API_KEY,
            "Content-Type": "application/json"
        }
        
        # Get project details first
        project_url = f"{BASE_URL}/workspaces/{WORKSPACE_SLUG}/projects/{params['project_id']}/"
        project_response = requests.get(project_url, headers=headers)
        if project_response.status_code != 200:
            return f"Error: Failed to get project details - {project_response.status_code}"
        
        project = project_response.json()
        
        # Get issues
        issues_url = f"{BASE_URL}/workspaces/{WORKSPACE_SLUG}/projects/{params['project_id']}/issues/"
        response = requests.get(issues_url, headers=headers)
        
        if response.status_code == 200:
            issues = response.json().get("results", [])
            if not issues:
                return f"No issues found in project {project['name']}"
            
            # Filter issues based on parameters
            if params.get("state_id"):
                issues = [i for i in issues if i.get("state") == params["state_id"]]
            if params.get("priority"):
                issues = [i for i in issues if i.get("priority") == params["priority"]]
            if params.get("assignee_id"):
                issues = [i for i in issues if params["assignee_id"] in i.get("assignees", [])]
            if params.get("label_id"):
                issues = [i for i in issues if params["label_id"] in i.get("labels", [])]
            
            if not issues:
                return "No issues match the specified filters"
            
            # Format output
            output = [f"Issues in {project['name']}:"]
            for issue in issues:
                priority_text = f" - {issue['priority'].title()} Priority" if issue['priority'] != "none" else ""
                state_text = f" - {issue.get('state_detail', {}).get('name', 'Unknown State')}"
                output.append(f"{issue['sequence_id']}. {issue['name']}{priority_text}{state_text}")
            
            return "\n".join(output)
        return f"Error: API request failed with status code {response.status_code}"
    
    except requests.RequestException as e:
        return f"Error: Network error - {str(e)}"
    except Exception as e:
        return f"Error: Unexpected error - {str(e)}"
