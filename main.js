// Final review before submission
const fs = require("fs");
function timeToSeconds(t){
  let [time,period] = t.trim().split(" ");
  let [h,m,s] = time.split(":").map(Number);

  if(period==="pm" && h!==12) h+=12;
  if(period==="am" && h===12) h=0;

  return h*3600+m*60+s;
}

function secondsToTime(sec){
  let h=Math.floor(sec/3600);
  sec%=3600;
  let m=Math.floor(sec/60);
  let s=sec%60;

  return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function durationToSec(t){
  let [h,m,s]=t.split(":").map(Number);
  return h*3600+m*60+s;
}
// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime,endTime){

  let start = timeToSeconds(startTime);
  let end = timeToSeconds(endTime);

  return secondsToTime(end - start);

}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime){

  let start = timeToSeconds(startTime);
  let end = timeToSeconds(endTime);

  let workStart = timeToSeconds("8:00:00 am");
  let workEnd = timeToSeconds("10:00:00 pm");

  let idle = 0;

  if(start < workStart) idle += workStart - start;
  if(end > workEnd) idle += end - workEnd;

  return secondsToTime(idle);

}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime){

  let shift = durationToSec(shiftDuration);
  let idle = durationToSec(idleTime);

  return secondsToTime(shift - idle);

}
// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime){

  let active = durationToSec(activeTime);

  let normal = 8*3600 + 24*60;
  let eid = 6*3600;

  let d = new Date(date);

  if(d >= new Date("2025-04-10") && d <= new Date("2025-04-30"))
    return active >= eid;

  return active >= normal;

}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj){

  let rows = fs.readFileSync(textFile,"utf8").trim().split("\n");

  // 1️⃣ check duplicate
  for(let r of rows){
    let c = r.split(",");
    if(c[0]===shiftObj.driverID && c[2]===shiftObj.date)
      return {};
  }

  // 2️⃣ calculate values
  let shiftDuration = getShiftDuration(shiftObj.startTime,shiftObj.endTime);
  let idleTime = getIdleTime(shiftObj.startTime,shiftObj.endTime);
  let activeTime = getActiveTime(shiftDuration,idleTime);
  let quota = metQuota(shiftObj.date,activeTime);

  // 3️⃣ create row
  let newRow = [
    shiftObj.driverID,
    shiftObj.driverName,
    shiftObj.date,
    shiftObj.startTime,
    shiftObj.endTime,
    shiftDuration,
    idleTime,
    activeTime,
    quota,
    false
  ].join(",");

  // 4️⃣ add row
let inserted = false;

for(let i=rows.length-1;i>=0;i--){
  let c = rows[i].split(",");
  if(c[0]===shiftObj.driverID){
    rows.splice(i+1,0,newRow);
    inserted = true;
    break;
  }
}

if(!inserted) rows.push(newRow);

  fs.writeFileSync(textFile,rows.join("\n"));

  // 5️⃣ return object
  return {
    ...shiftObj,
    shiftDuration,
    idleTime,
    activeTime,
    metQuota:quota,
    hasBonus:false
  };

}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue){

  let rows = fs.readFileSync(textFile,"utf8").trim().split("\n");

  for(let i=0;i<rows.length;i++){
    let cols = rows[i].split(",");

    if(cols[0]===driverID && cols[2]===date){
      cols[9] = String(newValue);   // IMPORTANT
      rows[i] = cols.join(",");
    }
  }

  fs.writeFileSync(textFile,rows.join("\n"));

}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month){

  let rows = fs.readFileSync(textFile,"utf8").trim().split("\n");

  let count = 0;
  let found = false;

  for(let r of rows){
    let c = r.split(",");
    let m = c[2].split("-")[1];

    if(c[0]===driverID){
      found = true;

      if(Number(m)===Number(month) && c[9].trim()==="true")
        count++;
    }
  }

  return found ? count : -1;

}
// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month){

  let rows = fs.readFileSync(textFile,"utf8").trim().split("\n");

  let total = 0;

  for(let r of rows){
    let c = r.split(",");
    let m = c[2].split("-")[1];

    if(c[0]===driverID && Number(m)===Number(month)){
      total += durationToSec(c[7]);
    }
  }

  return secondsToTime(total);

}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month){

  let rows = fs.readFileSync(textFile,"utf8").trim().split("\n");

  // get day off from rate file
  let rates = fs.readFileSync(rateFile,"utf8").trim().split("\n");
  let dayOff;

  for(let r of rates){
    let c = r.split(",");
    if(c[0]===driverID) dayOff = c[1];
  }

  let total = 0;

  for(let r of rows){
    let c = r.split(",");
    let m = c[2].split("-")[1];

    if(c[0]===driverID && Number(m)===Number(month)){

      let d = new Date(c[2]);
      let dayName = d.toLocaleDateString("en-US",{weekday:"long"});

      if(dayName===dayOff) continue;

      if(d>=new Date("2025-04-10") && d<=new Date("2025-04-30"))
        total += 6*3600;
      else
        total += 8*3600 + 24*60;

    }
  }

  total = Math.max(0,total - bonusCount*2*3600);

  return secondsToTime(total);

}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile){

  let rows = fs.readFileSync(rateFile,"utf8").trim().split("\n");

  let basePay, tier;

  for(let r of rows){
    let c = r.split(",");
    if(c[0]===driverID){
      basePay = Number(c[2]);
      tier = Number(c[3]);
    }
  }

  let allow = [0,50,20,10,3];

  let miss = Math.max(0, durationToSec(requiredHours)-durationToSec(actualHours));

  miss = Math.max(0, miss - allow[tier]*3600);

  let billable = Math.floor(miss/3600);

  let rate = Math.floor(basePay/185);

  return basePay - billable*rate;

}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
