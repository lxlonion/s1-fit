from __future__ import annotations

import gzip
import json
from pathlib import Path
import sys
import unittest
import zlib


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "python"))

from s1demo.monotonic_zigzag import generate_restricted_monotonic_candidates
from s1demo.runtime import _frame_from_payload, calculate


class RemovalEventTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        manifest = json.loads((ROOT / "data" / "manifest.json").read_text("utf-8"))
        shard = zlib.crc32(b"META") % manifest["shards"]
        with gzip.open(
            ROOT / "data" / "shards" / f"{shard:02x}.json.gz", "rt"
        ) as handle:
            payload = json.load(handle)["META"]
        cls.frame = _frame_from_payload(payload)
        cls.result = calculate(payload)
        cls.bars = {bar["time"]: bar for bar in cls.result["bars"]}

    def test_meta_first_disappearance_dates(self) -> None:
        examples = {
            ("2026-05-12", "2026-06-02", "B"),
            ("2026-06-15", "2026-06-22", "B"),
            ("2026-07-02", "2026-07-07", "S"),
            ("2026-07-13", "2026-07-15", "S"),
        }
        actual = {
            (event["originTime"], event["removedTime"], event["side"])
            for event in self.result["removalEvents"]
        }
        self.assertTrue(examples <= actual, examples - actual)

        days = list(self.bars)
        for origin_time, removed_time, side in examples:
            removed_index = days.index(removed_time)
            key = (days.index(origin_time), side)
            before = {
                (item.marker, item.side)
                for item in generate_restricted_monotonic_candidates(
                    self.frame.iloc[:removed_index]
                )
            }
            after = {
                (item.marker, item.side)
                for item in generate_restricted_monotonic_candidates(
                    self.frame.iloc[: removed_index + 1]
                )
            }
            self.assertIn(key, before)
            self.assertNotIn(key, after)

    def test_event_origin_and_price_match_removed_markers(self) -> None:
        events = self.result["removalEvents"]
        markers = self.result["removedMarkers"]
        self.assertEqual(
            {(event["originTime"], event["side"]) for event in events},
            {(marker["time"], marker["text"][0]) for marker in markers},
        )
        self.assertEqual(len(events), len(markers))
        for event in events:
            self.assertLess(event["originTime"], event["removedTime"])
            anchor = "low" if event["side"] == "B" else "high"
            self.assertEqual(
                event["originPrice"], self.bars[event["originTime"]][anchor]
            )


if __name__ == "__main__":
    unittest.main()
