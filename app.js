const http = require("http");
const https = require("https");
const fs = require("fs");

let serverData = {}

let cacheTiming = 900000
// let cacheTiming = 60000
let saveTiming = 3600000

// fs.access(`stats.json`, function(error){
//     if (error) {
//         console.log("Файл со статистикой не найден, создаем..");
//         fs.writeFile('stats.json', '{}', (err) => {
//           if(err) throw err;
//           console.log('Файл со статистикой создан');
//           serverData = JSON.parse(fs.readFileSync("stats.json", "utf8"));
//         });
//     } else {
//       serverData = JSON.parse(fs.readFileSync("stats.json", "utf8"));
//     }
// });

fs.readdir('logsJson', function( err, files ) {
    files.forEach(function(file, index) {
      console.log(file)
      serverData[file.replace('.json', '')] = JSON.parse(fs.readFileSync(`logsJson/${file}`, "utf8"));
    })
})

setInterval(function() {
  try {
    let Data = new Date();

    https.get('https://servers-live.fivem.net/api/servers/', (resp) => {
      resp.setEncoding('utf8');
      let data = '';

      // A chunk of data has been recieved.
      resp.on('data', (chunk) => {
        data += chunk;
      });

      // The whole response has been received. Print out the result.
      resp.on('end', () => {
        try {
          let newPlayerCount = 0;
          let newServerCount = 0;
          let newData = JSON.parse(data)
          for (item of newData) {
            if (!serverData[item.EndPoint])
              serverData[item.EndPoint] = {};
            if (!serverData[item.EndPoint].data)
              serverData[item.EndPoint].data = {};
            if (!serverData[item.EndPoint].data[`${Data.getDate()}.${Data.getMonth()}.${Data.getFullYear()}`])
              serverData[item.EndPoint].data[`${Data.getDate()}.${Data.getMonth()}.${Data.getFullYear()}`] = [];
            serverData[item.EndPoint].playerCount = item.Data.clients;
            serverData[item.EndPoint].data[`${Data.getDate()}.${Data.getMonth()}.${Data.getFullYear()}`].push(item.Data.clients)

            newPlayerCount = newPlayerCount + item.Data.clients;
            newServerCount++;
          };

          if (!serverData.fivem)
            serverData.fivem = {};
          if (!serverData.fivem.data)
            serverData.fivem.data = {};
          if (!serverData.fivem.data[`${Data.getDate()}.${Data.getMonth()}.${Data.getFullYear()}`])
            serverData.fivem.data[`${Data.getDate()}.${Data.getMonth()}.${Data.getFullYear()}`] = {};
          if (!serverData.fivem.data[`${Data.getDate()}.${Data.getMonth()}.${Data.getFullYear()}`].playerCount) {
              serverData.fivem.data[`${Data.getDate()}.${Data.getMonth()}.${Data.getFullYear()}`].playerCount = [];
              serverData.fivem.data[`${Data.getDate()}.${Data.getMonth()}.${Data.getFullYear()}`].serverCount = [];
          }
          serverData.fivem.playerCount = newPlayerCount;
          serverData.fivem.serverCount = newServerCount;
          serverData.fivem.data[`${Data.getDate()}.${Data.getMonth()}.${Data.getFullYear()}`].playerCount.push(newPlayerCount);
          serverData.fivem.data[`${Data.getDate()}.${Data.getMonth()}.${Data.getFullYear()}`].serverCount.push(newServerCount);

          console.log(serverData.fivem.playerCount, serverData.fivem.serverCount)
        } catch(e) {
          console.log(e)
        }
      });

    }).on("error", (err) => {
      console.log("Error: " + err.message);
    });

  } catch(e) {
    console.log(e);
  }
}, cacheTiming)

setInterval(function() {
  for (var items of Object.entries(serverData)) {
    fs.writeFile(`logsJson/${items[0]}.json`, JSON.stringify(items[1]), (err) => {
      if(err) throw err;
      console.log(`Данные о статистике серверов сохранены ${items[0]}`);
    });
  }
}, saveTiming)

// setInterval(function() {
//   fs.writeFile('stats.json', JSON.stringify(serverData), (err) => {
//     if(err) throw err;
//     console.log('Данные о статистике серверов сохранены');
//   });
// }, saveTiming)

// 60000
// 3600000

http.createServer(function(request, response){
  try {
    if (request.url === '/getAllServerData') {
      var Data = new Date();
      let gainPlayersForToday = 0;

      var serverLocalData = serverData.fivem;
      var highestPlayerCountToday = 0;
      if (serverLocalData.data[`${Data.getDate()}.${Data.getMonth()}.${Data.getFullYear()}`]) {
        serverLocalData.data[`${Data.getDate()}.${Data.getMonth()}.${Data.getFullYear()}`].playerCount.forEach(item => {
          if (highestPlayerCountToday < item)
            highestPlayerCountToday = item;
        });
      }
      let averageNumberOfPlayersYesterday = 0;
      let averageYesterdayNumberPlayersCount = 0;
      var PastData = new Date(Data.getFullYear(), Data.getMonth(), Data.getDate());
      PastData.setDate(PastData.getDate() - 1);
      if (serverLocalData.data[`${PastData.getDate()}.${PastData.getMonth()}.${PastData.getFullYear()}`]) {
        serverLocalData.data[`${PastData.getDate()}.${PastData.getMonth()}.${PastData.getFullYear()}`].playerCount.forEach(item => {
          if (item > 100) { // Иногда мастер лист падает и выдает неверные данные, мы эту статистику не берем
            averageNumberOfPlayersYesterday = averageNumberOfPlayersYesterday + item;
            averageYesterdayNumberPlayersCount++;
          }
        });
      }

      averageNumberOfPlayersYesterday = averageNumberOfPlayersYesterday / averageYesterdayNumberPlayersCount;

      let averageNumberOfPlayersToday = 0;
      let averageTodayNumberPlayersCount = 0;
      if (serverLocalData.data[`${Data.getDate()}.${Data.getMonth()}.${Data.getFullYear()}`]) {
        serverLocalData.data[`${Data.getDate()}.${Data.getMonth()}.${Data.getFullYear()}`].playerCount.forEach(item => {
          if (item > 100) { // Иногда мастер лист падает и выдает неверные данные, мы эту статистику не берем
            averageNumberOfPlayersToday = averageNumberOfPlayersToday + item;
            averageTodayNumberPlayersCount++;
          }
        });
      }

      averageNumberOfPlayersToday = averageNumberOfPlayersToday / averageTodayNumberPlayersCount;

      gainPlayersForToday = (averageNumberOfPlayersToday*100/averageNumberOfPlayersYesterday)-100

      let gainServersForToday = 0;

      var serverLocalData = serverData.fivem;

      let averageNumberOfServersYesterday = 0;
      let averageYesterdayNumberServerCount = 0;
      var PastData = new Date(Data.getFullYear(), Data.getMonth(), Data.getDate());
      PastData.setDate(PastData.getDate() - 1);
      if (serverLocalData.data[`${PastData.getDate()}.${PastData.getMonth()}.${PastData.getFullYear()}`]) {
        serverLocalData.data[`${PastData.getDate()}.${PastData.getMonth()}.${PastData.getFullYear()}`].serverCount.forEach(item => {
          if (item > 1) { // Иногда мастер лист падает и выдает неверные данные, мы эту статистику не берем
            averageNumberOfServersYesterday = averageNumberOfServersYesterday + item;
            averageYesterdayNumberServerCount++;
          }
        });
      }

      averageNumberOfServersYesterday = averageNumberOfServersYesterday / averageYesterdayNumberServerCount;

      let averageNumberOfServersToday = 0;
      let averageTodayNumberServersCount = 0;
      if (serverLocalData.data[`${Data.getDate()}.${Data.getMonth()}.${Data.getFullYear()}`]) {
        serverLocalData.data[`${Data.getDate()}.${Data.getMonth()}.${Data.getFullYear()}`].serverCount.forEach(item => {
          if (item > 1) { // Иногда мастер лист падает и выдает неверные данные, мы эту статистику не берем
            averageNumberOfServersToday = averageNumberOfServersToday + item;
            averageTodayNumberServersCount++;
          }
        });
      }

      averageNumberOfServersToday = averageNumberOfServersToday / averageTodayNumberServersCount;

      gainServersForToday = (averageNumberOfServersToday*100/averageNumberOfServersYesterday)-100

      response.write(JSON.stringify({playerCount : serverLocalData.playerCount, serverCount : serverLocalData.serverCount, highestPlayerCountToday : highestPlayerCountToday, gainPlayersForToday : `${gainPlayersForToday.toFixed()}%`, gainServersForToday : `${gainServersForToday.toFixed()}%`}));
    } else if (request.url.split('/')[1] === 'getServerData') {
      if (serverData[request.url.split('/')[2]]) {
        var Data = new Date();
        let gainForToday = 0;

        var serverLocalData = serverData[request.url.split('/')[2]];
        var highestPlayerCountToday = 0;
        if (serverLocalData.data[`${Data.getDate()}.${Data.getMonth()}.${Data.getFullYear()}`]) {
          serverLocalData.data[`${Data.getDate()}.${Data.getMonth()}.${Data.getFullYear()}`].forEach(item => {
            if (highestPlayerCountToday < item)
              highestPlayerCountToday = item;
          });
        }
        let averageNumberOfPlayersYesterday = 0;
        let averageYesterdayNumberCount = 0;
        var PastData = new Date(Data.getFullYear(), Data.getMonth(), Data.getDate());
        PastData.setDate(PastData.getDate() - 1);
        if (serverLocalData.data[`${PastData.getDate()}.${PastData.getMonth()}.${PastData.getFullYear()}`]) {
          serverLocalData.data[`${PastData.getDate()}.${PastData.getMonth()}.${PastData.getFullYear()}`].forEach(item => {
            averageNumberOfPlayersYesterday = averageNumberOfPlayersYesterday + item;
            averageYesterdayNumberCount++;
          });
        }

        averageNumberOfPlayersYesterday = averageNumberOfPlayersYesterday / averageYesterdayNumberCount;

        let averageNumberOfPlayersToday = 0;
        let averageTodayNumberCount = 0;
        if (serverLocalData.data[`${Data.getDate()}.${Data.getMonth()}.${Data.getFullYear()}`]) {
          serverLocalData.data[`${Data.getDate()}.${Data.getMonth()}.${Data.getFullYear()}`].forEach(item => {
            averageNumberOfPlayersToday = averageNumberOfPlayersToday + item;
            averageTodayNumberCount++;
          });
        }

        averageNumberOfPlayersToday = averageNumberOfPlayersToday / averageTodayNumberCount;

        gainForToday = (averageNumberOfPlayersToday*100/averageNumberOfPlayersYesterday)-100

        response.write(JSON.stringify({playerCount : serverLocalData.playerCount, highestPlayerCountToday : highestPlayerCountToday, gainForToday : `${gainForToday.toFixed()}%`}));
      } else {
        response.write('You entered the wrong IP');
      }
    } else {
      response.write('Welcome to the FiveM MasterList Stats API by Vinipux322 / https://vk.com/mylifeiscode / https://github.com/Vinipux322/FiveM-MasterList-stats');
    }
    response.end();
  } catch(e) {
    console.log(e);
  }
}).listen(3000);
