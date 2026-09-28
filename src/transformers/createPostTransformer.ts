import { Marked, type Tokens } from "marked";
import type { PostData } from "../lib/core/types.ts";

/**
 * A modular post transformer.
 *
 * Given a list of parsed markdown tokens and the surrounding post data,
 * returns a new list of tokens with transformations applied. Transformers are
 * composed by {@link createPostTransformer} and run in registration order.
 */
export type PostTransformer = (
    tokens: Tokens.Generic[],
    post: PostData,
) => Tokens.Generic[];

/**
 * Composes multiple `PostTransformer`s into a single one, applying them in
 * order to the token stream.
 *
 * @param transformers The transformers to compose.
 */
export function createPostTransformer(
    ...transformers: PostTransformer[]
): PostTransformer {
    return (tokens, post) =>
        transformers.reduce(
            (currentTokens, transformer) => transformer(currentTokens, post),
            tokens,
        );
}

/**
 * Convenience helper: transforms a markdown string into HTML using a composed
 * `PostTransformer`.
 *
 * @param markedInstance The `Marked` instance to use for parsing/rendering.
 * @param markdown The raw markdown of the post body.
 * @param transformer The composed transformer to apply.
 * @param post The post data, passed through to each transformer.
 */
export function renderTransformed(
    markedInstance: Marked,
    markdown: string,
    transformer: PostTransformer,
    post: PostData,
): string {
    const tokens = markedInstance.lexer(markdown);
    const transformed = transformer(tokens, post);
    return markedInstance.parser(transformed);
}
