from enum import Enum
import json
from typing import Any


def class_to_json(obj: Any) -> str:
    return json.dumps(obj, default=__process_obj)

def __process_obj(obj: Any) -> Any:
    if isinstance(obj, Enum):
            return obj.value
    return obj.__dict__ if hasattr(obj, "__dict__") else obj