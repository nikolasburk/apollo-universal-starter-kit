import React from 'react';
import { SubscribeToMoreOptions } from 'apollo-client';
import { graphql, compose } from 'react-apollo';
import update from 'immutability-helper';

import PostCommentsView from '../components/PostCommentsView.web';

import ADD_COMMENT from '../graphql/AddComment.graphql';
import EDIT_COMMENT from '../graphql/EditComment.graphql';
import DELETE_COMMENT from '../graphql/DeleteComment.graphql';
import COMMENT_SUBSCRIPTION from '../graphql/CommentSubscription.graphql';
import ADD_COMMENT_CLIENT from '../graphql/AddComment.client.graphql';
import COMMENT_QUERY_CLIENT from '../graphql/CommentQuery.client.graphql';

interface Comment {
  id?: number;
  content: string;
  __typename?: string;
}

interface CommentResponse {
  comment: Comment;
}

interface PostCommentsProps {
  postId: number;
  comments: Comment[];
  comment: Comment;
  onCommentSelect: (comment: Comment) => void;
  subscribeToMore: (option: SubscribeToMoreOptions) => void;
}

interface PostId {
  postId: number;
}

interface Post {
  comments: Comment[];
  content: string;
  id: number;
  title: string;
  __typename?: string;
}

interface PostQuery {
  post: Post;
}

function AddComment(prev: PostQuery, node: Comment) {
  // ignore if duplicate
  if (prev.post.comments.some((comment: Comment) => comment.id === node.id)) {
    return prev;
  }

  const filteredComments = prev.post.comments.filter((comment: Comment) => comment.id);
  return update(prev, {
    post: {
      comments: {
        $set: [...filteredComments, node]
      }
    }
  });
}

function DeleteComment(prev: PostQuery, id: number) {
  const index = prev.post.comments.findIndex((comment: Comment) => comment.id === id);

  // ignore if not found
  if (index < 0) {
    return prev;
  }

  return update(prev, {
    post: {
      comments: {
        $splice: [[index, 1]]
      }
    }
  });
}

class PostComments extends React.Component<PostCommentsProps, any> {
  public subscription: any;
  constructor(props: PostCommentsProps) {
    super(props);
    this.subscription = null;
  }

  public componentWillReceiveProps(nextProps: PostCommentsProps) {
    // Check if props have changed and, if necessary, stop the subscription
    if (this.subscription && this.props.postId !== nextProps.postId) {
      this.subscription = null;
    }

    // Subscribe or re-subscribe
    if (!this.subscription) {
      this.subscribeToCommentList(nextProps.postId);
    }
  }

  public componentWillUnmount() {
    this.props.onCommentSelect({ id: null, content: '' });

    if (this.subscription) {
      // unsubscribe
      this.subscription();
    }
  }

  public subscribeToCommentList = (postId: number) => {
    const { subscribeToMore } = this.props;

    this.subscription = subscribeToMore({
      document: COMMENT_SUBSCRIPTION,
      variables: { postId },
      updateQuery: (prev: PostQuery, { subscriptionData: { data: { commentUpdated: { mutation, id, node } } } }) => {
        let newResult = prev;

        if (mutation === 'CREATED') {
          newResult = AddComment(prev, node);
        } else if (mutation === 'DELETED') {
          newResult = DeleteComment(prev, id);
        }

        return newResult;
      }
    });
  };

  public render() {
    return <PostCommentsView {...this.props} />;
  }
}

const PostCommentsWithApollo = compose(
  graphql(ADD_COMMENT, {
    props: ({ mutate }) => ({
      addComment: (content: string, postId: number) =>
        mutate({
          variables: { input: { content, postId } },
          optimisticResponse: {
            __typename: 'Mutation',
            addComment: {
              __typename: 'Comment',
              id: null,
              content
            }
          },
          updateQueries: {
            post: (prev: PostQuery, { mutationResult: { data: { addComment } } }) => {
              if (prev.post) {
                return AddComment(prev, addComment);
              }
            }
          }
        })
    })
  }),
  graphql<any, PostId>(EDIT_COMMENT, {
    props: ({ ownProps: { postId }, mutate }) => ({
      editComment: (id: number, content: string) =>
        mutate({
          variables: { input: { id, postId, content } },
          optimisticResponse: {
            __typename: 'Mutation',
            editComment: {
              __typename: 'Comment',
              id,
              content
            }
          }
        })
    })
  }),
  graphql<any, PostId>(DELETE_COMMENT, {
    props: ({ ownProps: { postId }, mutate }) => ({
      deleteComment: (id: number) =>
        mutate({
          variables: { input: { id, postId } },
          optimisticResponse: {
            __typename: 'Mutation',
            deleteComment: {
              __typename: 'Comment',
              id
            }
          },
          updateQueries: {
            post: (prev: PostQuery, { mutationResult: { data: { deleteComment } } }) => {
              if (prev.post) {
                return DeleteComment(prev, deleteComment.id);
              }
            }
          }
        })
    })
  }),
  graphql(ADD_COMMENT_CLIENT, {
    props: ({ mutate }) => ({
      onCommentSelect: (comment: Comment) => {
        mutate({ variables: { comment } });
      }
    })
  }),
  graphql<CommentResponse>(COMMENT_QUERY_CLIENT, {
    props: ({ data: { comment } }) => ({ comment })
  })
)(PostComments);

export default PostCommentsWithApollo;
