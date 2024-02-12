import { RssSummarizer } from "@rsssummarizer/rsssummarizer";
import { feeds } from "./feeds";

const summarizer = new RssSummarizer();

summarizer.addRssUrls(...feeds);

summarizer.summarize();
