import Head from "next/head";
import type { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";
import { getArticle, listArticles } from "../../lib/articles";
import { ArticleImage } from "../../components/ArticleImage";
import { Comments } from "../../components/Comments";

export const getStaticPaths = (async () => {
  const articles = await listArticles();
  return { paths: articles.map(({ slug }) => ({ params: { slug } })), fallback: false };
}) satisfies GetStaticPaths;

export const getStaticProps = (async (context) => {
  const article = await getArticle(String(context.params?.slug));
  if (!article) return { notFound: true };
  return { props: { article } };
}) satisfies GetStaticProps;

export default function ArticlePage({ article }: InferGetStaticPropsType<typeof getStaticProps>) {
  const { title, author, image, body, slug } = article;
  return (
    <article>
      <Head>
        <title>{title}</title>
      </Head>
      <h1>{title}</h1>
      <p className="byline">By {author}</p>
      <ArticleImage image={image} />
      {body.map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
      <section id="comments">
        <Comments slug={slug} />
      </section>
    </article>
  );
}
