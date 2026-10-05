# Decisions

Each item is a question for a product manager, then the assumption used so the work could continue. The numeric bands live next to the activity that uses them.

## Skiing

Is a lowland town with no snow a bad ski day, or not a ski place at all?

Under 800 m, with no snow on the ground and no fresh snow, the day is not applicable. At 800 m a bare slope is still scored, and it scores poorly. 800 m is a judgment: most European ski areas sit above it, valley cities do not.

Which elevation? The geocoding elevation of the town, not the forecast grid. The grid can sit on a nearby ridge. We only know the place that was searched, not the nearest resort.

## Snow depth units

Open-Meteo `snow_depth_mean` is in meters. Skiing wants centimeters, so the mapper multiplies by 100 and rounds. `0.87` m becomes `87` cm. A null stays null and that part is left out of the score. Fresh snowfall is already in centimeters.

## Surfing

Can wind direction be scored from a city search?

No. Offshore is better and onshore is worse, and that needs a shoreline we do not have. Wind speed is a veto at 50 km/h or more, in any direction. It is not a weighted part. A light-wind band would rank a strong offshore day as bad.

Wave height and period are the daily maximums. The marine API has no daily mean. The max is the day's best surf, which is the question. Height is significant wave height, the buoy measure, not the face height a surfer quotes.

An inland point returns HTTP 200 with null waves. A missing marine date, and a marine response that is not OK, become null waves too. Surfing is then not applicable. The rest of the week still loads.

## Outdoor sightseeing

Should a soaked day score zero?

No. Rain is the heaviest part, and it is zero at 10 mm. A day that is otherwise ideal still scores 60. Thunderstorms and freezing rain are the vetoes. A gale and a freeze stay on their bands. There is no "not applicable" for walking a town.

## Indoor sightseeing

Is indoor the reverse of outdoor?

No. The floor is 70, always, because a museum is a good plan on a clear day too. Rain, cold, and heat can add up to 30 points. A clear day stays at 70, below a perfect outdoor day. A 10 mm day rises to 90, above outdoor's 60. We do not check that the town has a museum. A hamlet still scores.

## Several towns

Springfield matches more than one place. The server returns the list and does not pick. The page scores a week only after one place is chosen, or when the search had a single match.
