/*   ====== All Variables ========  */
let puppeteer = require("puppeteer");
let path = require("path")
const PDFDocument = require('pdfkit');
const fs = require('fs');

let browser;
let page;

let data = [];
//delhi data
let hospitalBed=[];
//hospital data
let hospitalList = [];

/*if(fs.existsSync('output.pdf')){
  fs.unlinkSync('output.pdf')
} */
//nearby hospital and distance
let nearbyHospital = [];

async function fn() {
  try {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ["--start-maximized"],
    });
    let pagesArr = await browser.pages();
    page = pagesArr[0];  //first tab
    
    hospitalBed =  await getCovid19HospitalsDataOfDelhi(); //returns an object of the covid19 beds in delhi
    hospitalList = await getAllHospital();  //returns all covid hospital in delhi
     let h= await getMinDis(hospitalList);  //it returns an array of index of the hospital which have min distance to the distance which ou have entered and and the index of that hospital
     let name = Object.values(Object.values(hospitalList[h[1]])[0][0])[0]  //name of the nearby hospital 
     let availableBed = Object.values(Object.values(hospitalList[h[1]])[0][2]) // avilable beds in the nearby hospital
     let availableOxygen =  Object.values(Object.values(hospitalList[h[1]])[0][3]) // oxygen available in nearby hospital
     
      nearbyHospital.push({hospitalName:name}); 
      nearbyHospital.push({availableBeds:availableBed});
      nearbyHospital.push({OxygenLeftFor:availableOxygen})
      nearbyHospital.push({distance:h[0]})
     let obj ={     //push data in an object
        "hospitalData": hospitalBed, 
        "nearbyHospital" :nearbyHospital
    }
   //make a json file
    fs.writeFile("data.json", JSON.stringify(obj), function(err, result) {
      if(err) console.log('error', err);
      
  })
   await pdfGenerator(obj); //make pdf
     
  } catch (err) {
    console.log(err);
  }
}

async function pdfGenerator(data){
  try{
    const doc = new PDFDocument();
// Pipe its output somewhere, like to a file or HTTP response
    doc.pipe(fs.createWriteStream('output.pdf'));
///set font size
doc.fontSize(18);
doc.text(`Total Beds :- ${data.hospitalData[0].totalBed}`, {
  width: 410,
  align: 'justify',
  fontFamily:"sans-serif"
}
);
doc.moveDown();  //move to the next line
doc.text(`Occuppied Beds :- ${data.hospitalData[1].occupiedBed}`, {
  width: 410,
  align: 'justify'
}
);

doc.moveDown();
doc.text(`Vacant Beds :- ${data.hospitalData[2].vacantBed}`, {
  width: 410,
  align: 'justify'
}
);
doc.moveDown();
doc.text(`Total ICU Beds :- ${data.hospitalData[3].Icubed}`, {
  width: 410,
  align: 'justify'
}
);
doc.moveDown();
doc.text(`Occupied ICU Beds :- ${data.hospitalData[4].occupiedICUBed}`, {
  width: 410,
  align: 'justify'
}
);
doc.moveDown();
doc.text(`Vacant ICU Beds :- ${data.hospitalData[5].vacantICUBed}`, {
  width: 410,
  align: 'justify'
}
);

doc.moveDown();
doc.text(`hospital name :- ${data.nearbyHospital[0].hospitalName}`, {
  width: 410,
  align: 'justify'
}
);

doc.moveDown();
doc.text(`Available Beds :- ${data.nearbyHospital[1].availableBeds}`, {
  width: 410,
  align: 'justify'
}
);
doc.moveDown();
doc.text(`Oxygen Left For ${data.nearbyHospital[2].OxygenLeftFor}`, {
  width: 410,
  align: 'justify'
}
);

doc.moveDown();
doc.text(`Distance is  ${data.nearbyHospital[3].distance}km`, {
  width: 410,
  align: 'justify'
}
);
doc.end();


  }catch(err){
    console.log(err);
  }
}

async function getMinDis(hospitalBeds) {
  let minDis = 100000; 
  let ind = 0;
  for (let i = 0; i < 3; i++) {
    let name = Object.values(Object.values(hospitalBeds[i])[0][0])[0]; //extract the name of the hospital
    
    if ( name ==  "  Central Govt Sardar Patel Covid Army hospital") { //because this hospital can not be search on map
        continue;
    }
    distance = await getdistance(name); //it gives the distance between two places
     let  Dis = parseInt(distance); //it is a string ,so parse it in integer
         if (minDis > Dis) {
          minDis = Dis;
          ind = i;
         }     
  }
   let a = [];
    a.push(minDis);
    a.push(ind);
    console.log(minDis)
    return a;
}

async function getdistance(hosData) {
    try{
        await page.goto("https://www.google.co.in/maps/@28.5656306,77.2057666,16z")  //go on map
        await page.waitForSelector("#searchboxinput")  //wait for selector where you type the name of the hospital
        await page.click("#searchboxinput"); //click on the input box
        await page.type("#searchboxinput", hosData); //type hospital name
        await page.keyboard.press("Enter"); //press enter
        await page.waitForSelector("[data-value='Directions']");  
        await page.click('[data-value="Directions"]');
        await page.waitForSelector("[aria-label='Choose starting point, or click on the map...']",  { visible: true });
       await page.type("[aria-label='Choose starting point, or click on the map...']",  "shahdra");
        await page.keyboard.press("Enter");
       let dis =  await getData(" .section-directions-trip-distance.section-directions-trip-secondary-text div");
       
       return dis;
    }catch(err){
        console.log(err);
    } 
}

async function getData(selector) {
  try{
    await page.waitForSelector(selector, { visible: true })
   let val= await  page.$eval(selector, (el) => el.textContent);
   return val;
  }catch(err){
      console.log(err);
  }
}
async function getAllHospital(){
    try{
        await page.goto("https://coronabeds.jantasamvad.org/beds.html")
        let hospitalBed = [];
        await page.waitForSelector("#hospitals_list tr:nth-child(2n+1)", {visible:true})
   let hospitalList = await  page.evaluate(() => Array.from(document.querySelectorAll('#hospitals_list tr:nth-child(2n+1)'), e => e.innerText));
  hospitalList.forEach(element => { 
        if(element.split("\t")[3].split("\n")[0] !=0 && element.split("\t")[4].split("\n")[0].trim() != ""){
          let arr = [];
          arr.push({hospitalName:element.split("\t")[0].trim()});
          arr.push({totalBeds:element.split("\t")[2].trim()});
          arr.push({vacantBeds:element.split("\t")[3].split("\n")[0].trim()});
          arr.push({oxgenLeft:element.split("\t")[4].split("\n")[0].trim()});
         hospitalBed.push({arr})  
        }
      });
      
      return hospitalBed;
    }catch(err){
        console.log(err);
    }
}
async function getCovid19HospitalsDataOfDelhi() {
    try{
        await page.goto("https://delhifightscorona.in/data/hospital-beds/") // goes on this website
          let totalBeds = await getData("#beds_total.card-text"); // return total beds in delhi's hospital
          hospitalBed.push({totalBed:totalBeds});
         let occupiedBeds = await getData(".card-body #beds_occupied"); // return total occupy beds in delhi's hospital
         hospitalBed.push({occupiedBed:occupiedBeds})
         let vacantBeds = await getData(".card-body #beds_vacant");   // return total vacant beds in delhi's hospital
         hospitalBed.push({vacantBed:vacantBeds})
         let Icubeds = await getData(".card-body #covid_icu_beds_total");    // return total ICU beds in delhi's hospital
         hospitalBed.push({Icubed:Icubeds})
        let occupiedICUBeds = await getData(".card-body #covid_icu_beds_occupied"); // return total occupied ICU beds in delhi's hospital
        hospitalBed.push({occupiedICUBed:occupiedICUBeds});
        let vacantICUBeds = await getData(".card-body #covid_icu_beds_vacant");   // total vacant ICU beds in delhi's hospital
        hospitalBed.push({vacantICUBed:vacantICUBeds})
        return hospitalBed
    }catch(err){
        console.log(err);
    }
}

fn();
