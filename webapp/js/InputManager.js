export class InputManager {
    constructor() {
        // IMU 1 (Control)
        this.pitch = 0;
        this.roll = 0;
        this.yaw = 0;
        this.gforce = 1.0;
        this.pitchVelocity = 0;
        this.rollVelocity = 0;
        this.lastPitch = 0;
        this.lastRoll = 0;

        // IMU 2 (Gestures)
        this.pitch2 = 0;
        this.roll2 = 0;
        this.lastPitch2 = 0;
        this.lastRoll2 = 0;
        this.p2Velocity = 0;
        this.r2Velocity = 0;

        this.isConnected = false;
        this.keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, Space: false };

        // Gesture Events
        this.onGesture = null; // Callback for (type)

        window.addEventListener('keydown', (e) => { if(this.keys.hasOwnProperty(e.code)) this.keys[e.code] = true; });
        window.addEventListener('keyup', (e) => { if(this.keys.hasOwnProperty(e.code)) this.keys[e.code] = false; });
    }

    async connectIMU(statusCallback) {
        try {
            if ('serial' in navigator) {
                const port = await navigator.serial.requestPort();
                await port.open({ baudRate: 115200 });
                this.isConnected = true;
                statusCallback("Dual IMU Connected!");
                this.readSerialData(port, statusCallback);
            } else {
                statusCallback("Web Serial API not supported.");
            }
        } catch (err) {
            statusCallback("Connection failed: " + err.message);
        }
    }

    async readSerialData(port, statusCallback) {
        const textDecoder = new TextDecoderStream();
        port.readable.pipeTo(textDecoder.writable);
        const reader = textDecoder.readable.getReader();
        let buffer = "";

        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                if (value) {
                    buffer += value;
                    let lines = buffer.split('\n');
                    buffer = lines.pop();

                    for (let line of lines) {
                        line = line.trim();
                        if (line.startsWith('{') && line.endsWith('}')) {
                            try {
                                const data = JSON.parse(line);
                                // Map Dual IMU
                                if (data.p1 !== undefined) {
                                    this.lastPitch = this.pitch;
                                    this.lastRoll = this.roll;
                                    this.pitch = Math.max(-1, Math.min(1, data.p1 / 45.0));
                                    this.roll = Math.max(-1, Math.min(1, data.r1 / 45.0));
                                    this.yaw = data.y1 || 0;
                                    this.gforce = data.g1 || 1.0;
                                    this.pitchVelocity = this.pitch - this.lastPitch;
                                    this.rollVelocity = this.roll - this.lastRoll;
                                }

                                if (data.p2 !== undefined) {
                                    this.lastPitch2 = this.pitch2;
                                    this.lastRoll2 = this.roll2;
                                    this.pitch2 = data.p2; // Degrees
                                    this.roll2 = data.r2;
                                    this.p2Velocity = this.pitch2 - this.lastPitch2;
                                    this.r2Velocity = this.roll2 - this.lastRoll2;

                                    this.detectGestures();
                                }
                            } catch (e) {}
                        }
                    }
                }
            }
        } catch (error) {
            this.isConnected = false;
            statusCallback("IMU Disconnected!");
        }
    }

    detectGestures() {
        if (!this.onGesture) return;

        // Forward Tilt -> Turbo (Pitch > 30)
        if (this.pitch2 > 30 && this.p2Velocity > 5) {
            this.onGesture('TURBO');
        }
        // Backward Tilt -> Auto Flip (Pitch < -30)
        else if (this.pitch2 < -30 && this.p2Velocity < -5) {
            this.onGesture('BACKFLIP');
        }
        // Left Tilt -> Missile (Roll < -30)
        else if (this.roll2 < -30 && this.r2Velocity < -5) {
            this.onGesture('MISSILE');
        }
        // Right Tilt -> Magnet/Shield (Roll > 30)
        else if (this.roll2 > 30 && this.r2Velocity > 5) {
            this.onGesture('SHIELD');
        }
    }

    update() {
        if (!this.isConnected) {
            this.lastPitch = this.pitch;
            this.lastRoll = this.roll;
            let tp = 0, tr = 0;
            if (this.keys.ArrowUp) tp = -1;
            else if (this.keys.ArrowDown) tp = 1;
            if (this.keys.ArrowLeft) tr = -1;
            else if (this.keys.ArrowRight) tr = 1;

            this.pitch += (tp - this.pitch) * 0.2;
            this.roll += (tr - this.roll) * 0.2;
            this.pitchVelocity = this.pitch - this.lastPitch;
            this.rollVelocity = this.roll - this.lastRoll;
        }
    }
}
