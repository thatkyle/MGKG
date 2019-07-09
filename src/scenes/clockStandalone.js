// This is the standalone version of clock for dev/testing, it has not been modularized for inclusion in a Phaser game with multiple scenes
// I am keeping this as a working version of the skill/timing check feature in case the modular version (clock.js) breaks

/****************

Issue with current version of timerTest is that the zone is always in the same spot so the timing is easy to repeat.
The timing should appear at different spots to make the check more difficult and unpredictable.
The first thing to try is to re-allocate the missed timing zones to take up more or less of the circle randomly.
The main challenge is that I need to re-generate the timing zones every time the timingCheck is called, re-draw the arcs
based on the timing zones, and check the timingCheck result against the correct timingZones.

So I will need to make a function to dynamically generate new timing zones and store them in a global variable each time
the timingCheck is called.

I should also begin to organize my code into modules and classes.

I am also experiencing issues with the timingCheck "clock hand" not animating as smoothly as I would like. I am not sure
whether it an FPS issue in phaser or a monitor issue with retiina. So I may need to test on a different monitor/computer too.

***************/

let config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#2d2d2d',
    input: {
        queue: true,
    },
    scene: {
        create: create,
        update: update,
    }
};

// ****** HELPER FUNCTIONS ******
const sumArray = (accumulator, currentValue) => accumulator + currentValue;
const getAvgOfArray = arr => arr.reduce(sumArray, 0) / arr.length;

// Phaser timers are based on frames, 60fps is standard
// framesPer60 means that the number of frames will be adjusted
// if the timerEvent is less than or greater than 1 second.
// So 2 frames per 60 would be converted to 3 frames per 90
// for a 1.5 second timer, or 1 frame per 30 for a 0.5 second
// timer, etc.
// I can also switch to javascripts builtin time library
// if I want more timer precision / granularity.

let delay = 1000;

let timingCheckZones = {
    perfect: {
        zoneName: "Perfect",
        colorName: "light blue",
        color: 0x00FFFC,
        framesPer60: 1,
        frames: this.framesPer60 * (delay / 1000),
        numberOfZones: 1,
        damageMultiplier: 1.3,
    },
    excellent: {
        zoneName: "Excellent",
        colorName: "green",
        color: 0x3BFF5B,
        framesPer60: 2,
        frames: this.framesPer60 * (delay / 1000),
        numberOfZones: 2,
        damageMultiplier: 1.15,
    },
    great: {
        zoneName: "Great",
        colorName: "green yellow",
        color: 0xC7E83F,
        framesPer60: 2,
        frames: this.framesPer60 * (delay / 1000),
        numberOfZones: 2,
        damageMultiplier: 1.0,
    },
    good: {
        zoneName: "Good",
        colorName: "yellow",
        color: 0xFFD652,
        framesPer60: 2,
        frames: this.framesPer60 * (delay / 1000),
        numberOfZones: 2,
        damageMultiplier: 0.85,
    },
    poor: {
        zoneName: "Poor",
        colorName: "orange",
        color: 0xE8873F,
        framesPer60: 2,
        frames: this.framesPer60 * (delay / 1000),
        numberOfZones: 2,
        damageMultiplier: 0.70,
    },
    miss: {
        zoneName: "Miss",
        colorName: "red",
        color: 0xFF3A38,
        framesPer60: 51,
        frames: this.framesPer60 * (delay / 1000),
        numberOfZones: 2,
        damageMultiplier: 0,
    }
};

let damageMultipliers = [];
const getAvgDamageMultiplier = () => getAvgOfArray(damageMultipliers);

// delay variable is above timingCheckZones
let graphics;
let clockSize = 80;
let spell1CastEvents = [];
let timeHeld = 0;
let keyOverHeld;
let missZoneRandomizer;
let arcStartRandomizer;
let drawTimingCheckOffsets = [50, -50, 0]
let drawTimingCheckXOffsetRandomizer;
let drawTimingCheckYOffsetRandomizer;

let game = new Phaser.Game(config);

const getRandomNumber = (min = 0.25, max = 0.55) => Math.random() * (max - min) + min;
const getRandomInt = max => Math.floor(Math.random() * Math.floor(max));

function create ()
{
    let that = this;
    this.input.keyboard.on('keydown', function (event) {
        if (event.code === "KeyQ" && spell1CastEvents.length === 0 && !keyOverHeld) {
            missZoneRandomizer = getRandomNumber();
            arcStartRandomizer = Math.random();
            drawTimingCheckXOffsetRandomizer = drawTimingCheckOffsets[getRandomInt(drawTimingCheckOffsets.length)];
            drawTimingCheckYOffsetRandomizer = drawTimingCheckOffsets[getRandomInt(drawTimingCheckOffsets.length)];
            spell1CastEvents.push(that.time.addEvent({ delay: delay, repeat: 0 }));
        }
    });

    graphics = this.add.graphics({ x: 0, y: 0 });

    this.input.keyboard.on('keyup', function (event) {
        if (event.code === "KeyQ") {
            if (spell1CastEvents.length > 0) {
                // console.log(spell1CastEvents[0].getProgress() * delay);
                let framesHeld = 60 * (spell1CastEvents[0].getProgress());
                // console.log(framesHeld);
                let arcsToDraw = getArcsToDraw(timingCheckZones);
                let timingZoneTimeIntervals = getTimingZoneTimeIntervals(arcsToDraw);
                // console.log(timingZoneTimeIntervals);
                // console.log(framesHeld);
                let timingCheckZone = getTimingCheckZone(framesHeld, timingZoneTimeIntervals);
                console.log(timingCheckZone);
                damageMultipliers.push(timingCheckZones[timingCheckZone.toLowerCase()].damageMultiplier);
                timeHeld = 0;
                spell1CastEvents[0].remove(false);
                spell1CastEvents.pop();
            }
            keyOverHeld = false;
        }
    });
}

function update ()
{
    let pointer = this.input.activePointer;
    graphics.clear();
    if (typeof spell1CastEvents[0] !== 'undefined' && spell1CastEvents[0] !== null) {
        let arcsToDraw = getArcsToDraw(timingCheckZones)
        drawArcs(pointer.worldX + drawTimingCheckXOffsetRandomizer, pointer.worldY + drawTimingCheckYOffsetRandomizer, arcsToDraw);
        drawClock(pointer.worldX + drawTimingCheckXOffsetRandomizer, pointer.worldY + drawTimingCheckYOffsetRandomizer, spell1CastEvents[0]);   
    };
}

function getArcsToDraw(zones /*= timingCheckZones*/) {
    zoneFrames = [];
    let missZone1;
    let missZone2;
    for (zone of Object.values(zones)) {
        if (zone.zoneName === "Miss") {
            // let missZoneRandomizer = Math.random()
            // console.log("****************");
            // console.log(missZoneRandomizer);
            missZone1 = zone.framesPer60 * missZoneRandomizer;
            missZone2 = zone.framesPer60 * (1 - missZoneRandomizer);
        } else {
            zoneFrames.push(zone.framesPer60 / zone.numberOfZones);
        }
    }
    zoneFrames.push(missZone1);
    zoneFrames.push(missZone2);
    // zoneFrames order: 0 perfect (1), 1 excellent (2), 2 great (2), 3 good (2), 4 poor (2), 5 miss (2)
    arcsToDraw = [
        [zones.miss.color, zoneFrames[5]],
        [zones.poor.color, zoneFrames[4]],
        [zones.good.color, zoneFrames[3]], 
        [zones.great.color, zoneFrames[2]],
        [zones.excellent.color, zoneFrames[1]],
        [zones.perfect.color, zoneFrames[0]],
        [zones.excellent.color, zoneFrames[1]],
        [zones.great.color, zoneFrames[2]],
        [zones.good.color, zoneFrames[3]],
        [zones.poor.color, zoneFrames[4]],
        [zones.miss.color, zoneFrames[6]],
    ];
    return arcsToDraw;
}

function getTimingZoneTimeIntervals(arcsToDraw /*= getArcsToDraw()*/) {
    let zoneTimeIntervals = [];
    for (arc of arcsToDraw) {
        zoneTimeIntervals.unshift(parseFloat(arc[1]));
    }
    let zoneTimeIntervalsCumulative = [];
    for (i=0;i<zoneTimeIntervals.length;i++) {
        zoneTimeIntervalsCumulative.unshift(zoneTimeIntervals.slice(i).reduce(sumArray));
    }
    return zoneTimeIntervalsCumulative;
}

function getTimingCheckZone(frame, timingZoneTimeIntervals /*= getTimingZoneTimeIntervals()*/) {
    timingCheckZoneNames = ["Miss", "Poor", "Good", "Great", "Excellent", "Perfect", "Excellent", "Great", "Good", "Poor", "Miss"];
    // console.log(timingZoneTimeIntervals);
    for (i=0;i<timingZoneTimeIntervals.length;i++) {
        if (frame < timingZoneTimeIntervals[i]) {
            return timingCheckZoneNames[i];
        }
    }
}

// instead of solid colors, I want an arc with a gradient
function drawArcs(x, y, arcsToDraw /*= getArcsToDraw(timingCheckZones)*/) {
    // console.log("*******ARCS DRAWN******", arcsToDraw);
    arcStart = 360 * arcStartRandomizer;
    for (arc of arcsToDraw) {
        graphics.fillStyle(arc[0], 1);
        graphics.beginPath();
        graphics.moveTo(x, y);
        graphics.arc(x, y, clockSize, Phaser.Math.DegToRad(arcStart), Phaser.Math.DegToRad(arcStart + (arc[1] * 6)), false, true);
        graphics.closePath();
        graphics.fillPath();

        graphics.fillStyle(0x2d2d2d, 1);
        graphics.beginPath();
        graphics.moveTo(x, y);
        graphics.arc(x, y, clockSize * .7, Phaser.Math.DegToRad(arcStart), Phaser.Math.DegToRad(arcStart + (arc[1] * 6)), false, true);
        graphics.closePath();
        graphics.fillPath();

        arcStart += (arc[1] * 6);
    }
};

function drawClock (x, y, timer)
{
    //  Progress is between 0 and 1, where 0 = the hand pointing up and then rotating clockwise a full 360

    //  The frame
    graphics.lineStyle(3, 0x000000, 1);
    // graphics.strokeCircle(x, y, clockSize);

    let angle;
    let dest;
    let p1;
    let p2;
    let size;

    //  The current iteration hand
    size = clockSize * 0.95;

    angle = (360 * timer.getProgress()) + 360 * arcStartRandomizer;
    dest = Phaser.Math.RotateAroundDistance({ x: x, y: y }, x, y, Phaser.Math.DegToRad(angle), size);

    graphics.lineStyle(3, 0xffff00, 1);
    graphics.beginPath();
    graphics.moveTo(x, y);  
    graphics.lineTo(dest.x, dest.y);

    graphics.strokePath();
    graphics.closePath();

    ++timeHeld;
    if (timeHeld >= 60 * (delay / 1000)) {
        keyOverHeld = true;
        timeHeld = 0;
        spell1CastEvents[0].remove(false);
        spell1CastEvents.pop();
    }
}
