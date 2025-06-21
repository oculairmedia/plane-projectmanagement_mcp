import json
import requests
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def create_plane_project(params_json: str = "{}") -> str:
    """
    Create a new project in the Plane project management system.
    
    Args:
        params_json: A JSON string containing project details:
            {
                "name": "Project Name",
                "identifier": "PROJ",
                "description": "Project description",
                "network": 2  # Optional: 0 for private, 2 for public
            }
    
    Returns:
        str: Success message with project details or error message
    
    Example:
        >>> create_plane_project('{"name": "Test Project", "identifier": "TEST"}')
        "Project created: Test Project (TEST)"
    """
    try:
        # Parse parameters
        try:
            params = json.loads(params_json) if params_json else {}
        except json.JSONDecodeError as e:
            logging.error(f"Invalid JSON parameters: {e}")
            return "Error: Invalid JSON parameters"
        
        # Validate required parameters
        project_name = params.get("name")
        project_identifier = params.get("identifier")
        if not project_name:
            logging.error("Project name is required")
            return "Error: Project name is required"
        if not project_identifier:
            logging.error("Project identifier is required")
            return "Error: Project identifier is required"
        
        # Configuration
        API_KEY = os.environ.get("PLANE_API_KEY", "plane_api_614f7240a5df4177840558c34bddb668")
        BASE_URL = os.environ.get("PLANE_BASE_URL", "http://192.168.50.90/api/v1")
        WORKSPACE_SLUG = os.environ.get("PLANE_WORKSPACE_SLUG", "test-space")
        
        headers = {
            "X-API-Key": API_KEY,
            "Content-Type": "application/json"
        }
        
        # Construct project data
        project_data = {
            "name": project_name,
            "identifier": project_identifier,
            "description": params.get("description", ""),
            "network": params.get("network", 2)  # Default to public
        }
        
        url = f"{BASE_URL}/workspaces/{WORKSPACE_SLUG}/projects/"
        try:
            response = requests.post(url, headers=headers, json=project_data)
            response.raise_for_status()  # Raise HTTPError for bad responses (4xx or 5xx)
        except requests.exceptions.RequestException as e:
            logging.error(f"API request failed: {e}")
            return f"Error: API request failed - {str(e)}"
        
        if response.status_code == 201:
            result = response.json()
            message = f"Project created: {result['name']} ({result['identifier']})"
            logging.info(message)
            return message
        else:
            logging.error(f"API request failed with status code {response.status_code}: {response.text}")
            return f"Error: API request failed with status code {response.status_code}"
    
    except Exception as e:
        logging.exception("Unexpected error during project creation")
        return f"Error: Unexpected error - {str(e)}"

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1:
        try:
            params_json = sys.argv[1]
            result = create_plane_project(params_json)
            print(result)
        except Exception as e:
            print(f"Error: {e}")
    else:
        print("Error: Missing JSON parameters")
