import Head from "next/head";
import type { GetStaticPaths, GetStaticProps } from "next";
import { getArticle, listArticles, type Article } from "../../lib/articles";
import { ArticleImage } from "../../components/ArticleImage";
import { Comments } from "../../components/Comments";

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: (await listArticles()).map((a) => ({ params: { slug: a.slug } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<{ article: Article }> = async ({ params }) => {
  const article = await getArticle(String(params?.slug));
  return article ? { props: { article } } : { notFound: true };
};

export default function ArticlePage({ article }: { article: Article }) {
  return (
    <article>
      <Head>
        <title>{article.title}</title>
      </Head>
      <h1>{article.title}</h1>
      <p className="byline">By {article.author}</p>
      <ArticleImage image={article.image} />
      {article.body.map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
      <Comments slug={article.slug} />
    </article>
  );
}
