import { Article } from "@rsssummarizer/article";
import Parser from "rss-parser";

interface RssSummarizerOptions {
  rssUrls?: string[];
  feedLimit?: number;
}

export class RssSummarizer {
  private rssUrlsValue: string[] = [];
  private feedLimitValue: number;

  constructor(options: RssSummarizerOptions = {}) {
    this.rssUrlsValue = options.rssUrls || [];
    this.feedLimitValue = options.feedLimit || 3;
  }

  addRssUrls(...url: string[]) {
    this.rssUrlsValue.push(...url);
  }

  set feedLimit(value: number) {
    this.feedLimitValue = value;
  }

  async loadArticles(): Promise<Article[]> {
    const parser = new Parser();

    const articles: Article[] = [];

    for (const rssUrl of this.rssUrlsValue) {
      try {
        const feed = await parser.parseURL(rssUrl);

        articles.push(
          ...feed.items
            .filter((item) => item.title && item.content && item.link)
            .slice(0, this.feedLimitValue)
            .map(
              (item) =>
                new Article(
                  item.title as string,
                  item.content as string,
                  item.link as string
                )
            )
        );
      } catch (e) {
        console.log(e);
      }
    }

    console.log(
      articles.map(
        (article) => `
        title: ${article.title},
        content: ${article.content}
      `
      )
    );

    return articles;
  }

  async summarize() {
    interface Message {
      role: string;
      content: string;
    }

    const messages: Message[] = [];

    messages.push({
      role: "system",
      content:
        "You are a bot that is made to summarize articles from the world wide web. Next messages will contain articles fetched from web, and you have to extract from them what are the current trends in tech, some interesting things to talk about, what is most important. After all the articles, you will be asked to write a summary. The next messages art articles.",
    });

    const articles = await this.loadArticles();

    for (const index in articles) {
      const article = articles[index];

      messages.push({
        role: "system",
        content: `This is the article number ${index}. The title is: "${
          article.title
        }". This is the content of the article: "${article.content.replaceAll(
          '"',
          "'"
        )}".`,
      });
    }

    messages.push({
      role: "user",
      content:
        "Please write an article summarizing what have you read from the articles you was given.",
    });

    const body = JSON.stringify({
      model: "llama2",
      messages: messages,
    });

    console.log(body);

    function readChunks(reader: any) {
      return {
        async *[Symbol.asyncIterator]() {
          let readResult = await reader.read();
          while (!readResult.done) {
            yield readResult.value;
            readResult = await reader.read();
          }
        },
      };
    }

    function bin2String(array: Uint8Array) {
      var result = "";
      for (var i = 0; i < array.length; i++) {
        result += String.fromCharCode(array[i]);
      }
      return result;
    }

    try {
      fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body,
      }).then(async (response) => {
        // response.body is a ReadableStream
        const reader = response.body?.getReader();
        for await (const chunk of readChunks(reader)) {
          const token = JSON.parse(bin2String(chunk)).message.content;
          process.stdout.write(token);
        }
      });
    } catch (e) {
      console.log(e);
    }
  }
}
