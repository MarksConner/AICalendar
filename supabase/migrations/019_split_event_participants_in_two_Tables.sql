

-- Drop the old eventsparticipants 
DROP TABLE IF EXISTS events_participants;

-- Create the participant table.
CREATE TABLE participants (
    participant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    info TEXT,
    full_address TEXT
);


-- Create new events_participants table with participant_id as a foreign key to participants
CREATE TABLE events_participants (
    participant_id UUID REFERENCES participants(participant_id) ON DELETE CASCADE,  
    event_id UUID REFERENCES events(event_id) ON DELETE CASCADE,
    PRIMARY KEY (participant_id, event_id)
);
