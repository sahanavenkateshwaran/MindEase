import unittest
from datetime import datetime
from bson import ObjectId

from app.routes.dashboard import serialize_for_json, build_dashboard_metric_snapshot


class DashboardSerializationTests(unittest.TestCase):
    def test_objectid_is_stringified_in_nested_payloads(self):
        payload = {
            "recommended_session": {
                "_id": ObjectId("507f1f77bcf86cd799439011"),
                "created_at": datetime(2024, 1, 1, 12, 0, 0),
                "items": [{"id": ObjectId("507f1f77bcf86cd799439012")}],
            }
        }

        result = serialize_for_json(payload)

        self.assertEqual(result["recommended_session"]["_id"], "507f1f77bcf86cd799439011")
        self.assertEqual(result["recommended_session"]["created_at"], "2024-01-01T12:00:00")
        self.assertEqual(result["recommended_session"]["items"][0]["id"], "507f1f77bcf86cd799439012")

    def test_dashboard_metric_snapshot_uses_emotion_and_stress_logic(self):
        snapshot = build_dashboard_metric_snapshot(
            current_emotion="Happy",
            stress_level=25,
            previous_stress=35,
            meditation_minutes=15,
            exercise_minutes=20,
            breathing_minutes=10,
            journal_activity=True,
            relaxation_sessions=2,
            wellness_tasks=4,
            recent_moods=["Happy", "Happy", "Neutral", "Anxiety"],
            confidence=0.87,
        )

        self.assertEqual(snapshot["current_emotion"], "Happy")
        self.assertIn("confidence", snapshot)
        self.assertGreater(snapshot["wellness_score"], 50)
        self.assertIn(snapshot["status"], {"Improving", "Stable", "Decreasing"})
        self.assertGreaterEqual(snapshot["stress_level"], 0)
        self.assertLessEqual(snapshot["stress_level"], 100)


if __name__ == "__main__":
    unittest.main()
