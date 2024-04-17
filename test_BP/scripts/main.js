// __________________________________________________________________
// |                    Coded by Tadase                             |
// |                https://tadase.carrd.co/                        |
// |________________________________________________________________|


import { system, world } from "@minecraft/server";

const overworld = world.getDimension('overworld');

/**
 * @typedef TimerObject
 * @type {Object}
 * @prop {Number} currentTime Actual value of the countdown
 * @prop {Boolean} enabled PVP switching enabled or disabled
 * @prop {Boolean} pvpState The current state of the pvp gamerule the script use to Enable or disable PVP gamerule
 * @prop {Number} minTime Minimum value to generate the random countdown
 * @prop {Number } maxTime 
 */

/**
 * To save values, modify/add this object's props and run in the next line `savePVPtimerData()`
 */
let timerdata = getPVPtimerData();

const prefix = '!';
const randomTime = () => (Math.floor(Math.random() * (timerdata.maxTime - timerdata.minTime + 1)) + timerdata.minTime);

function setTimer() {
    const countdown = randomTime();
    timerdata.currentTime = countdown;
    timerdata.enabled = true; 
    savePVPtimerData();
}

function stopTimer() {
    timerdata.enabled = false; 
    timerdata.currentTime = 0;
    savePVPtimerData();
}

function switchPVP(state) {
    timerdata.pvpState = state;
    savePVPtimerData();
    return overworld.runCommandAsync(`gamerule pvp ${state}`);
}

/**
 * @returns {TimerObject}
 */
function getPVPtimerData() { // This function, in this code is ran only one time
    const prop = world.getDynamicProperty('pvptimer');
    if (prop) {
        return  JSON.parse(prop);
    } else {
        return {
            currenTime: 0,
            enabled: false,
            pvpState: false,
            minTime: 60,
            maxTime: 60 * 3
        }
    }
}

function savePVPtimerData() {
    const newdata = world.setDynamicProperty('pvptimer', JSON.stringify(timerdata));
    return newdata;
}

world.beforeEvents.chatSend.subscribe((chatSend) => {
    if (!chatSend.message.startsWith(prefix)) return;

    const args = chatSend.message.slice(prefix.length).split(' ');
    const command = args.shift().toLowerCase();

    chatSend.cancel = true;

    if (command === 'start' && chatSend.sender.isOp) {

        if (timerdata.enabled) {
            return chatSend.sender.sendMessage(`PVP switching is already enabled.`);
        }

        switchPVP(false);
        setTimer();
        
        chatSend.sender.sendMessage(`Started PVP switching.`);
        chatSend.sender.sendMessage(`PvP initialized as: Off`);
        chatSend.sender.sendMessage(`ALERT: Do NOT use /gamerule pvp`);

        return;
    }
    else if (command === 'stop' && chatSend.sender.isOp) {

        if (!timerdata.enabled) {
            return chatSend.sender.sendMessage(`PVP switching is already disabled.`);
        }

        switchPVP(false);
        stopTimer();

        chatSend.sender.sendMessage('Stopped PVP switching.');
        chatSend.sender.sendMessage('PVP set to: OFF');
        return;
    } else if (command === 'timer' && chatSend.sender.isOp) {
        const action = args[0]?.toLowerCase();
        if (action === 'show') {

            chatSend.sender.sendMessage('Timer displaying (self) (only OPs)');
            system.run(() => chatSend.sender.addTag('pvptimer.display'));

        } else if (action === 'hide') {

            chatSend.sender.sendMessage('Timer hidden (self) (only OPs)');
            system.run(() => chatSend.sender.removeTag('pvptimer.display'));

        } else if(action === 'info') {
            chatSend.sender.sendMessage(' --- TIMER INFO ---');
            chatSend.sender.sendMessage('- State:   ' + (timerdata.enabled ? 'ON' : 'OFF'));
            chatSend.sender.sendMessage('- Current Time:   ' + timerdata.currentTime);
            chatSend.sender.sendMessage('- MIN seconds:   ' + timerdata.minTime);
            chatSend.sender.sendMessage('- MAX seconds:   ' + timerdata.maxTime);
            chatSend.sender.sendMessage('- Next PVP state:   ' + !timerdata.pvpState);
            chatSend.sender.sendMessage(' ------------------');


        } else {
            chatSend.sender.sendMessage('Invalid argument.');
            chatSend.sender.sendMessage(`Valid Syntax: ${prefix}timer <show | hide | info>`);

            return;
        }
    } else if (command === 'setup' && chatSend.sender.isOp) {
        let [time_min, time_max] = args;

        if (!time_max || !time_min) {
            chatSend.sender.sendMessage('Invalid argument.');
            chatSend.sender.sendMessage(`Valid Syntax: ${prefix}setup <min seconds: int> <max seconds: int>`);
            return;
        }

        // Number() transform string to number, if invalid is NaN
        // parseInt() removes decimals if its a float number
        
        time_min = parseInt(Number(time_min)); 
        time_max = parseInt(Number(time_max));

        if (!time_min || !time_max) {
            return chatSend.sender.sendMessage('Not a valid number or Zero.'); 
        } 

        timerdata.minTime = time_min;
        timerdata.maxTime = time_max;
        
        savePVPtimerData();

        chatSend.sender.sendMessage('PVP timer updated Sucesfully.');
        chatSend.sender.sendMessage('Min countdown time: ' + time_min + 's');
        chatSend.sender.sendMessage('Max countdown time: ' + time_max + 's'); 
        chatSend.sender.sendMessage('The PVP will switch in a random time (in seconds) between those two values.');
        return;
    } else {
        return chatSend.sender.sendMessage(`Command "${command}" not found.`);
    }
});

system.runInterval(() => {
    if (!world.getPlayers().length) return;

    if (timerdata['enabled'] && (system.currentTick % 25) === 0) { // every 1 second (25 ticks = 1s)
        // console.warn(timerdata.currentTime);
        if (timerdata.currentTime <= 0) {
            timerdata.pvpState = !timerdata.pvpState; // switch between True and False;
            switchPVP(timerdata.pvpState);
            setTimer();
            
            if (timerdata.pvpState) {
                world.sendMessage(' + PVP is Enabled'); 
            } else {
                world.sendMessage(' - PVP is Disabled');  
            }
            for (const player of world.getPlayers()) {
                player.playSound('random.levelup');
            }

        } else {
            timerdata.currentTime--;
            savePVPtimerData();

        }
    }
    const showtimer_players = world.getPlayers({
        tags: [ 'pvptimer.display' ]
    });

    if (showtimer_players.length) {
        for (const player of showtimer_players) {
            player.onScreenDisplay.setActionBar(`PVP timer: ${timerdata.enabled ? `${timerdata.currentTime}s for ${!timerdata.pvpState ? 'Enable' : 'Disable' } pvp` : 'Off'}`);
        }
    }

});

// __________________________________________________________________
// |                    Coded by Tadase                             |
// |                https://tadase.carrd.co/                        |
// |________________________________________________________________|