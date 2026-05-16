export class InputManager {
    constructor() {
        this.pitch = 0; // -1 to 1
        this.roll = 0;  // -1 to 1
        // Angular Velocity tracking for tricks
        this.pitchVelocity = 0; 
        this.rollVelocity = 0;
        this.lastPitch = 0;
        this.yaw = 0;
        this.lastYaw = 0;
        this.yawVelocity = 0;
        this.gforce = 1.0;

        this.isConnected = false;
        
        // Key map
        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false,
            Space: false
        };

        window.addEventListener('keydown', (e) => {
            if(this.keys.hasOwnProperty(e.code)) this.keys[e.code] = true;
        });
        window.addEventListener('keyup', (e) => {
            if(this.keys.hasOwnProperty(e.code)) this.keys[e.code] = false;
        });
    }

    async connectIMU(statusCallback) {
        try {
            if ('serial' in navigator) {
                const port = await navigator.serial.requestPort();
                await port.open({ baudRate: 115200 });
                this.isConnected = true;
                statusCallback("IMU Connected!");
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
                                if (data.pitch !== undefined && data.roll !== undefined) {
                                    this.lastPitch = this.pitch;
                                    this.lastRoll = this.roll;

                                    this.pitch = Math.max(-1, Math.min(1, data.pitch / 45.0));
                                    this.roll = Math.max(-1, Math.min(1, data.roll / 45.0));
                                    
                                    if(data.yaw !== undefined) {
                                        this.lastYaw = this.yaw;
                                        this.yaw = data.yaw; // raw degrees
                                        this.yawVelocity = this.yaw - this.lastYaw;
                                    }
                                    if(data.gforce !== undefined) {
                                        this.gforce = data.gforce;
                                    }

                                    this.pitchVelocity = (this.pitch - this.lastPitch);
                                    this.rollVelocity = (this.roll - this.lastRoll);
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

    update() {
        if (!this.isConnected) {
            this.lastPitch = this.pitch;
            this.lastRoll = this.roll;

            // Smooth keyboard inputs for velocity calculation
            let targetPitch = 0;
            let targetRoll = 0;

            if (this.keys.ArrowUp) targetPitch = -1;
            else if (this.keys.ArrowDown) targetPitch = 1;

            if (this.keys.ArrowLeft) targetRoll = -1;
            else if (this.keys.ArrowRight) targetRoll = 1;

            // Fake IMU smoothing for keyboard to generate velocity
            this.pitch += (targetPitch - this.pitch) * 0.2;
            this.roll += (targetRoll - this.roll) * 0.2;

            this.pitchVelocity = (this.pitch - this.lastPitch);
            this.rollVelocity = (this.roll - this.lastRoll);
        }
    }
}
