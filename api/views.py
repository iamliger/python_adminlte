# api/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status


class TestDataAPIView(APIView):
    def get(self, request, *args, **kwargs):
        """
        GET 요청을 처리하여 테스트 데이터를 반환합니다.
        """
        test_data = {
            "message": "안녕하세요! Django 백엔드에서 온 테스트 데이터입니다.",
            "timestamp": "2023-10-27T10:00:00Z",  # 예시 시간
            "data": [
                {"id": 1, "name": "아이템 A", "value": 100},
                {"id": 2, "name": "아이템 B", "value": 200},
            ],
        }
        return Response(test_data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        """
        POST 요청을 처리하여 받은 데이터를 에코하고 성공 메시지를 반환합니다.
        """
        received_data = request.data  # React에서 보낸 JSON 데이터
        print("Received data from React:", received_data)  # 서버 로그 확인용

        response_data = {
            "status": "success",
            "message": "데이터를 성공적으로 받았습니다.",
            "your_data": received_data,
        }
        return Response(response_data, status=status.HTTP_201_CREATED)
