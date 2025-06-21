import json
import requests
import os

def create_plane_issue(params_json: str = "{}") -> str:
    """
    Create a new issue in a Plane project.
    
    Args:
        params_json: A JSON string containing issue details:
            {
                "project_id": "uuid-of-project",
                "name": "Issue title",
                "description": "Issue description",
                "priority": "none|low|medium|high|urgent",
                "state_id": "uuid-of-state",  # Optional
                "assignee_ids": ["user-uuid"],  # Optional
                "label_ids": ["label-uuid"],  # Optional
                "start_date": "YYYY-MM-DD",  # Optional
                "target_date": "YYYY-MM-DD"  # Optional
            }
    
    Returns:
        str: Success message with issue details or error message
    
    Example:
        >>> create_plane_issue('{"project_id": "123", "name": "Bug Fix", "priority": "high"}')
        "Issue created: Bug Fix (#123)"
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
        if not params.get("name"):
            return "Error: Issue name is required"
        
        # Configuration
        API_KEY = os.environ.get("PLANE_API_KEY", "plane_api_614f7240a5df4177840558c34bddb668")
        BASE_URL = os.environ.get("PLANE_BASE_URL", "http://192.168.50.90/api/v1")
        WORKSPACE_SLUG = os.environ.get("PLANE_WORKSPACE_SLUG", "test-space")
        
        headers = {
            "X-API-Key": API_KEY,
            "Content-Type": "application/json"
        }
        
        # Prepare issue data
        issue_data = {
            "name": params["name"],
            "description": params.get("description", ""),
            "description_html": f"<p>{params.get('description', '')}</p>",
            "priority": params.get("priority", "none")
        }
        
        # Add optional fields if provided
        optional_fields = [
            "state_id", "assignee_ids", "label_ids",
            "start_date", "target_date"
        ]
        for field in optional_fields:
            if params.get(field):
                issue_data[field] = params[field]
        
        url = f"{BASE_URL}/workspaces/{WORKSPACE_SLUG}/projects/{params['project_id']}/issues/"
        response = requests.post(url, headers=headers, json=issue_data)
        
        if response.status_code == 201:
            result = response.json()
            return f"Issue created: {result['name']} (#{result['sequence_id']})"
        return f"Error: API request failed with status code {response.status_code}"
    
    except requests.RequestException as e:
        return f"Error: Network error - {str(e)}"
    except Exception as e:
        return f"Error: Unexpected error - {str(e)}"
