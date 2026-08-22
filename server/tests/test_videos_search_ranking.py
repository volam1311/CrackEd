"""Search results are ranked by which title matched.

The CrackEd (renamed) title ranks first because it is what the viewer actually
reads on the card; the source title is the fall-back for videos nobody has
renamed yet.
"""

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class FakeAggregateCursor:
    def __init__(self, items):
        self._items = items

    def __aiter__(self):
        async def gen():
            for item in self._items:
                yield item

        return gen()


class FakeVideos:
    def __init__(self):
        self.pipeline: list[dict] | None = None

    def aggregate(self, pipeline):
        self.pipeline = pipeline
        return FakeAggregateCursor([])


class FakeDB:
    def __init__(self):
        self.videos = FakeVideos()


def stage(pipeline: list[dict], key: str) -> dict:
    return next(s for s in pipeline if key in s)


def run_search(term: str = "calculus") -> list[dict]:
    fake = FakeDB()
    with patch("app.routers.videos.get_db", return_value=fake):
        response = client.get("/api/videos", params={"q": term})
    assert response.status_code == 200
    assert fake.videos.pipeline is not None
    return fake.videos.pipeline


def test_search_uses_an_aggregation_with_a_rank():
    pipeline = run_search()
    assert stage(pipeline, "$addFields")["$addFields"]["_rank"]


def test_display_title_ranks_above_original_title():
    pipeline = run_search()
    switch = stage(pipeline, "$addFields")["$addFields"]["_rank"]["$switch"]
    fields = [b["case"]["$regexMatch"]["input"]["$ifNull"][0] for b in switch["branches"]]
    scores = [b["then"] for b in switch["branches"]]

    assert fields == ["$display_title", "$original_title"]
    assert scores == [0, 1]  # lower sorts first
    assert switch["default"] > max(scores)  # channel-only matches rank last


def test_results_sort_by_rank_before_recency():
    pipeline = run_search()
    sort_keys = list(stage(pipeline, "$sort")["$sort"].items())
    assert sort_keys[0] == ("_rank", 1)
    assert sort_keys[1] == ("created_at", -1)


def test_rank_is_not_leaked_to_the_client():
    pipeline = run_search()
    assert stage(pipeline, "$unset")["$unset"] == "_rank"


def test_missing_display_title_does_not_break_ranking():
    """Videos nobody renamed have a null display_title; it must coerce to ''."""
    pipeline = run_search()
    switch = stage(pipeline, "$addFields")["$addFields"]["_rank"]["$switch"]
    for branch in switch["branches"]:
        assert branch["case"]["$regexMatch"]["input"]["$ifNull"][1] == ""
