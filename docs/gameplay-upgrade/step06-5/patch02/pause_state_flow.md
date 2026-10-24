# Pause — state flow (Patch 02)

```
 run ──(Pause button / P key / app hidden)──► paused ──────────────────────────────┐
                                               │  frozen: world, obstacles, player, │
                                               │  spawns, pickups, distance, score, │
                                               │  Turbo / Shield / magnet / double, │
                                               │  difficulty, collisions, death     │
                                               │  waits indefinitely                │
          ┌──────────── Resume (tap) ◄─────────┤                                    │
          ▼                                    ├── Retry (tap) ──► special pick → GO → new run
 run (same state, frame clock reset)           └── Home (tap)  ──► the race ends and counts → its result screen
```

Only an explicit tap leaves `paused`. Resume never re-rolls the Magic Bag (the equipped special lives
in the save, not in the run start).
