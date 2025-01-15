const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

async function fetchHadithBooks(hadistBookUrl) {
  try {
    const response = await axios.get(hadistBookUrl);
    const $ = cheerio.load(response.data);
    const hadits = [];

    $("#nav-index-buku .row .col").each((_, element) => {
      const number = $(element).find("p").text().trim();
      const links = $(element).find("a");

      hadits.push({
        number,
        arName: $(links[0]).text().trim(),
        name: $(links[1]).text().trim(),
        hadistUrl: $(links[1]).attr("href"),
        imam: $(links[2]).text().trim(),
        imamUrl: $(links[2]).attr("href"),
      });
    });

    const streamHadist = fs.createWriteStream("hadist-buku.csv");
    streamHadist.write("Number,Arabic Name,Name,Hadist URL,Imam,Imam URL\n");
    for (const hadist of hadits) {
      streamHadist.write(
        `"${hadist.number}","${hadist.arName}","${hadist.name}","${hadist.hadistUrl}","${hadist.imam}","${hadist.imamUrl}"\n`
      );

      await fetchHadithDetails(hadist);
    }
    streamHadist.end();
  } catch (error) {
    console.error("Error fetching hadith books:", error.message);
  }
}

async function fetchHadithDetails(hadist) {
  let page = 1;
  let status = true;

  while (status) {
    const hadistUrl = `${hadist.hadistUrl}?page_haditses=${page}`;
    try {
      const response = await axios.get(hadistUrl);
      const $ = cheerio.load(response.data);

      const hadistContent = [];
      $(".hadits").each((_, element) => {
        hadistContent.push({
          hadistName: $(element).find("h2").text().trim(),
          hadistArabic: $(element).find(".arabic").text().trim(),
          hadistTranslation: $(element).find(".indonesia").text().trim(),
        });
      });

      if (hadistContent.length > 0) {
        const streamDetail = fs.createWriteStream(
          `detail-${hadist.number}-${hadist.name}.csv`,
          { flags: page === 1 ? "w" : "a" }
        );

        if (page === 1) {
          streamDetail.write("Hadist Name,Arabic,Translation\n");
        }

        hadistContent.forEach((hadist) => {
          streamDetail.write(
            `"${hadist.hadistName}","${hadist.hadistArabic}","${hadist.hadistTranslation}"\n`
          );
        });

        streamDetail.end();
      }

      // Check for next page
      const nextPage = $(".pagination li.active").next().find("a").attr("href");
      if (!nextPage) {
        status = false;
      } else {
        page++;
      }
    } catch (error) {
      console.error(
        `Error fetching hadith details for ${hadist.name}:`,
        error.message
      );
      status = false;
    }
  }
}

// Start the process
fetchHadithBooks("https://hadits.tazkia.ac.id/");
