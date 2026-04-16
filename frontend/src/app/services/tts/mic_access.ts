// MIC Access Module
// This module handles access to the user's microphone for speech to text.
// It checks for permissions and retrieves the audio track from the user's microphone.
// Returns a MediaStreamTrack if access is granted, or null if access is denied or an error occurs.



export async function  accessMicrophone(): Promise<MediaStreamTrack | null> {
    try {
        const permissionStatus = await navigator.permissions.query({
            name: 'microphone' as PermissionName
        });

        if (permissionStatus.state === 'denied') {
            console.error('Microphone permission has been denied');
            return null;
        }
    } catch (error) {
        console.error('Error checking microphone permissions:', error);
        return null;
    }

    let stream: MediaStream | null = null; //

    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); // getUsermedia(constraints) where constraints is an object specifying the types of media to request, in this case audio only
    } catch (error) {
        console.error('Error getting microphone stream:', error);
        return null;
    }
    if (!stream || stream.getAudioTracks().length === 0) {
        console.error('Could not get a valid audio track.');
        return null; 
    }
    
    let audioTrack = stream.getAudioTracks()[0];
    console.log('Microphone access granted:', audioTrack);
    return audioTrack;
}




