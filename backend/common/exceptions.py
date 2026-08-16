from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    """
    Normalize error payloads: DRF returns validation errors as a bare dict of
    field -> messages. Wrap those under an ``errors`` key so clients can reliably
    distinguish field errors from a top-level ``detail`` message.
    """
    response = exception_handler(exc, context)
    if response is not None:
        data = response.data
        if isinstance(data, dict) and "detail" not in data:
            response.data = {"errors": data}
    return response
