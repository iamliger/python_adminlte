# baccara_analyse/core_utils.py

from django.conf import settings


def global_debug_log(message, *args, **kwargs):
    """
    settings.DEBUG가 True일 때만 메시지를 출력하는 전역 디버그 로깅 함수.
    """
    if settings.DEBUG:
        print(f"[DEBUG_LOG] {message}", *args, **kwargs)


def debug_context_processor(request):
    """
    settings.DEBUG 값을 템플릿 컨텍스트에 추가하는 컨텍스트 프로세서.
    """
    return {"DEBUG": settings.DEBUG}
