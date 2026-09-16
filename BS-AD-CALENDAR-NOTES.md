# BS / AD calendar implementation

Data: @remotemerge/nepali-date-converter 1.2.1 (MIT); source and license are bundled in js/vendor. The sole vendor modification exports the month-length table. Kalika uses validated UTC calendar-day arithmetic, not the upstream local-time output method.

Range: BS 1975-01-01 through 2099-12-30; AD 1918-04-13 through 2043-04-13. No runtime API calls. Future conversions follow this pinned dataset, not a guarantee of future official calendar announcements.

Validation: 45,657 daily round trips; invalid dates and boundaries; published 2082/2083 dates from Nepal Parliament and the Nepal Embassy in Brasilia; browser conversion tests in Kathmandu, Los Angeles and Auckland. No festival or holiday data is included.
