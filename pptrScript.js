var fs = require('fs');
const puppeteer = require('puppeteer');


async function scrap(url) {
    const browser = await puppeteer.launch({ headless: false });
    let page = await browser.newPage();

    await page.setRequestInterception(true)
    page.on('request', (request) => {
        if (request.resourceType() === 'image') request.abort()
        else request.continue()
    })

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    //Getting links to all types of goods
    let subPages = await page.evaluate(() => {
        const q = document.querySelectorAll(".c-nav__list.c-nav__level3 > li > a");
        const tpmLinks = []

        q.forEach(el => {
            tpmLinks.push(el.getAttribute('href'))
        })

        return tpmLinks;
    })
    const TOTAL_DATA = []

    for (let j = 0; j < subPages.length; j++) { //Move through all categories

        await page.goto(url + subPages[j], { waitUntil: 'domcontentloaded' });

        const [button] = await page.$x("/html/body/div[1]/main/div/div/div[3]/div[4]/div/div[4]/div[1]/div/button");
        if (button) {
            await button.click(); //To start uploading another items
        }

        await autoScroll(page)

        let linksToAllGoodsOnPage = await page.evaluate(() => {
            const q = document.querySelectorAll(".c-product__link.c-product__focus");
            const images = []
            q.forEach((val) => {
                images.push(val.getAttribute('href'))
            })
            return images;
        })

        for (let i = 0; i < linksToAllGoodsOnPage.length / 6; i++) { // Getting info about every item on the page
            await page.goto(url + linksToAllGoodsOnPage[i], { waitUntil: 'domcontentloaded' });
            let itemInfo = await page.evaluate(() => {
                const imageList = document.querySelectorAll('.c-productcarousel__wrapper > li > button > img')
                let tmpColorInfo = document.querySelectorAll('.c-swatches__item > label span')

                const availableColors = []

                for (let i = 0; i < tmpColorInfo.length - 1; i += 2) {
                    availableColors.push({ colorName: tmpColorInfo[i].innerText, value: tmpColorInfo[i + 1].style.backgroundColor })
                }

                const imgResultList = []
                const iName = (document.querySelector('.c-product__name')).innerText
                let detailedInfo = ((document.querySelector('#productLongDesc')).innerText)
                detailedInfo = detailedInfo.replace(/\n/g, '');
                imageList.forEach((val) => {
                    imgResultList.push(val.getAttribute('src'))
                })

                return { name: iName, images: imgResultList, defailedInfo: detailedInfo, availableColors: availableColors, colorAmount: availableColors.length };
            })
            TOTAL_DATA.push(JSON.stringify(itemInfo))
        }
    }

    console.log(TOTAL_DATA);

    fs.writeFile('DATA.txt', TOTAL_DATA, function (err) {
        if (err) throw err;
    });
    await browser.close();
}

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight - window.innerHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

scrap('https://www.bottegaveneta.com');
