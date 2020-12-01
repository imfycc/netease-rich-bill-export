// ==UserScript==
// @name         网易有钱账单导出
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  网易有钱账单导出
// @author       https://imfy.cc @小猿大圣
// @match        https://qian.163.com/pc/index.html
// @updateURL    https://github.com/Youthink/netease-rich-bill-export/blob/master/netease-rich-bill-export.user.js
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  const tradeTypeArr = ['INCOME', 'OUTGO', 'TRANSFER'];
  const tradeTypeZHArr = ['收入', '支出', '转帐'];

  const commonParams = {
    startTime: 1262275200000, // 2020-01-01 00:00
    endTime: Date.now() + 86400000, // 明天当前时刻的时间戳
    size: 20
  }

  async function load() {
    const requestQueues = await getRequestQueues();
    console.log('🐱 喵~ 开始导出数据~~');
    const all = await allWithProgress(requestQueues, progress => console.log(`正在下载数据，目前进度${progress}%`));
    const resultArr = all.reduce((acc, item) => {
      acc.push(...item)
      return acc;
    });

    const data = toCSV(formatData(resultArr));
    // 参考链接 https://developer.mozilla.org/zh-CN/docs/Web/API/Blob
    const blob = new Blob(['\ufeff' + data.join('\n')], {type: 'text/csv,charset=UTF-8'});

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'netease-bill-data.csv';
    document.body.append(a);
    a.click();
    document.body.remove(a);
    askForCatFood();
  }

  function askForCatFood() {
    console.log('\n%c 🐱 小猫咪求打赏 \n', 'background: #6090E7; color: #fff');
    console.log('如果觉得工具好');
    console.log('打赏鼓励不嫌少');
    console.log('动动手指就几秒');
    console.log('猫咪肚肚能吃饱');
    console.log('\n%c 即刻、微博：@小猿大圣 ', 'background: #6090E7; color: #fff');

    console.log('%c            ','background:url(https://static01.imgkr.com/temp/5407b4fdf4ad46ab8d057b68aa406e5b.JPG) no-repeat left center;font-size:320px');
  }

  function formatData(arr) {
    console.log('正在处理数据格式~~');
    return arr.map(o => ({
      '时间': timestampToDate(o.date),
      '分类': o && o.category && o.category.categoryName,
      '子分类': o && o.subCategory && o.subCategory.categoryName,
      '类型': tradeTypeZHArr[o.tradeType - 1],
      '金额': (o.outMoney || o.inMoney).slice(1),
      '账户1': (o.outFund || o.inFund),
      '账户2': (o.outFund && o.inFund),
      '备注': o.remark
    }))
  }

  function toCSV(arr) {
    return [arr && arr[0] && Object.keys(arr[0]).join(',')].concat(arr.map(o => {
      return [
        o['时间'],
        o['分类'],
        o['子分类'],
        o['类型'],
        o['金额'],
        o['账号1'],
        o['账户2'],
        o['备注']
      ].join(',')
    }))
  }

  async function getRequestQueues() {
    const requestQueues = [];

    for(let num = 0; num < tradeTypeArr.length; num++) {
      const res = await loadData(0, tradeTypeArr[num]);
      const data = await tranformResponse(res);
      const { pagination } = data || {};
      const { totalPage = 1 } = pagination || {};

      for(let page = 0; page < totalPage; page++) {
        requestQueues.push(getBillData(page, tradeTypeArr[num]));
      }
    }
    return requestQueues;
  }

  function loadData(page, tradeType) {
    const params = getRequestParams(page, tradeType);
    return fetch(`https://qian.163.com/pc/xhr/data/bill/list.do?token=${getToken()}`, {
      "headers": {
        "accept": "application/json, text/plain, */*",
        "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7,fr;q=0.6",
        "cache-control": "no-cache",
        "content-type": "application/json;charset=UTF-8",
        "pragma": "no-cache",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-requested-with": "XMLHttpRequest",
        "cookie": document.cookie
      },
      "referrer": "https://qian.163.com/pc/index.html",
      "referrerPolicy": "no-referrer-when-downgrade",
      "body": params,
      "method": "POST",
      "mode": "cors"
    })
  }

  function getRequestParams(page = 0, tradeType = 'OUTGO') {
    const obj = Object.assign(commonParams, { page, tradeType });
    return JSON.stringify(obj);
  }

  async function tranformResponse(res) {
    const text = await res.text();
    const { data } = JSON.parse(text || {});
    return data || {};
  }

  async function getBillData(currPage, tradeType) {
    await sleep(currPage * 300);
    const res = await loadData(currPage, tradeType);
    const data = await tranformResponse(res);
    const { result = []} = data;
    return result;
  };

  function allWithProgress(requests, callback) {
    let index = 0;
    requests.forEach(item => {
      item.then(() => {
        index ++;
        const progress = (index * 100 / requests.length).toFixed(0);
        callback && callback(progress);
      })
    });
    return Promise.all(requests);
  }

  function sleep(delay) {
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  function getToken() {
    const cookieArr = document.cookie.split(';').map(o => o.trim());
    const cookies = cookieArr.map(o => o.split('=')).reduce((acc, item) => {
      const a = {};
      a[item[0]] = item[1];
      acc.push(a);
      return acc;
    }, [])

    const target = cookies.filter(cookie => cookie.TOKEN);
    return (target && target[0].TOKEN) || '';
  }

  function timestampToDate(timestamp) {
    const date = new Date(timestamp)
    return `${date.getFullYear()}-${date.getMonth() +1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}`;
  }

  load();
})();
