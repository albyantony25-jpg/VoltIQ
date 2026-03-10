class EnergyPlatformError(Exception):
    """Base exception for all custom VoltIQ errors."""
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

class ValidationError(EnergyPlatformError):
    def __init__(self, message: str):
        super().__init__(message, status_code=400)

class AIServiceError(EnergyPlatformError):
    def __init__(self, message: str = "AI generation failed. Please try again."):
        super().__init__(message, status_code=502)

class BillingError(EnergyPlatformError):
    def __init__(self, message: str):
        super().__init__(message, status_code=400)
