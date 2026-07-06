import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../../api/client';

interface Author {
  userId: string;
  fullName: string;
  role: string;
}

interface Comment {
  commentId: string;
  postId: string;
  author: Author;
  content: string;
  createdAt: string;
}

interface Post {
  postId: string;
  author: Author;
  content: string;
  createdAt: string;
  comments: Comment[];
}

export default function ClassStreamScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [postContent, setPostContent] = useState('');
  const [commentContents, setCommentContents] = useState<{ [postId: string]: string }>({});

  // Fetch posts
  const { data: posts, isLoading, error } = useQuery<Post[]>({
    queryKey: ['posts', classId],
    queryFn: () => apiRequest<Post[]>(`/classes/${classId}/posts`),
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest<Post>(`/classes/${classId}/posts`, {
        method: 'POST',
        body: { content },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', classId] });
      setPostContent('');
    },
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      apiRequest<Comment>(`/posts/${postId}/comments`, {
        method: 'POST',
        body: { content },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', classId] });
      setCommentContents({});
    },
  });

  const handlePostSubmit = () => {
    if (!postContent.trim()) return;
    createPostMutation.mutate(postContent.trim());
  };

  const handleCommentSubmit = (postId: string) => {
    const content = commentContents[postId];
    if (!content || !content.trim()) return;
    createCommentMutation.mutate({ postId, content: content.trim() });
  };

  const handleCommentTextChange = (postId: string, text: string) => {
    setCommentContents((prev) => ({ ...prev, [postId]: text }));
  };

  const navigateToSubSection = (section: 'stream' | 'exercises' | 'members' | 'settings') => {
    router.push(`/(teacher)/classes/${classId}/${section}`);
  };

  return (
    <View style={styles.container}>
      {/* Sub Header Navigation */}
      <View style={styles.subHeader}>
        <TouchableOpacity style={[styles.subHeaderTab, styles.activeTab]} onPress={() => navigateToSubSection('stream')}>
          <Text style={[styles.subHeaderTabTxt, styles.activeTabTxt]}>Stream</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.subHeaderTab} onPress={() => navigateToSubSection('exercises')}>
          <Text style={styles.subHeaderTabTxt}>Exercises</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.subHeaderTab} onPress={() => navigateToSubSection('members')}>
          <Text style={styles.subHeaderTabTxt}>Members</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.subHeaderTab} onPress={() => navigateToSubSection('settings')}>
          <Text style={styles.subHeaderTabTxt}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Main Feed */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Error fetching class stream</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.postId}
          contentContainerStyle={styles.feedList}
          ListHeaderComponent={
            <View style={styles.composerCard}>
              <Text style={styles.composerTitle}>Share with your class</Text>
              <TextInput
                style={styles.composerInput}
                placeholder="Announce something to your class..."
                multiline
                numberOfLines={3}
                value={postContent}
                onChangeText={setPostContent}
              />
              <TouchableOpacity
                style={styles.postButton}
                onPress={handlePostSubmit}
                disabled={createPostMutation.isPending}
              >
                {createPostMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.postButtonText}>Post</Text>
                )}
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item: post }) => (
            <View style={styles.postCard}>
              {/* Post Author & Content */}
              <View style={styles.postHeader}>
                <View>
                  <Text style={styles.authorName}>{post.author.fullName}</Text>
                  <Text style={styles.postDate}>{new Date(post.createdAt).toLocaleString()}</Text>
                </View>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeTxt}>{post.author.role}</Text>
                </View>
              </View>
              <Text style={styles.postContent}>{post.content}</Text>

              {/* Comments Section */}
              <View style={styles.commentsSection}>
                <Text style={styles.commentsTitle}>Comments ({post.comments?.length || 0})</Text>
                
                {post.comments?.map((comment) => (
                  <View key={comment.commentId} style={styles.commentItem}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentAuthor}>{comment.author.fullName}</Text>
                      <Text style={styles.commentDate}>
                        {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <Text style={styles.commentContent}>{comment.content}</Text>
                  </View>
                ))}

                {/* Add Comment Bar */}
                <View style={styles.addCommentContainer}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Add class comment..."
                    value={commentContents[post.postId] || ''}
                    onChangeText={(text) => handleCommentTextChange(post.postId, text)}
                  />
                  <TouchableOpacity
                    style={styles.sendCommentBtn}
                    onPress={() => handleCommentSubmit(post.postId)}
                    disabled={createCommentMutation.isPending}
                  >
                    <Text style={styles.sendCommentBtnTxt}>Send</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  subHeader: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  subHeaderTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderColor: '#2563EB',
  },
  subHeaderTabTxt: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  activeTabTxt: {
    color: '#2563EB',
  },
  feedList: {
    padding: 16,
  },
  composerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  composerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  composerInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 10,
    fontSize: 15,
    backgroundColor: '#FAFAFA',
    textAlignVertical: 'top',
    height: 70,
    marginBottom: 10,
  },
  postButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563EB',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  postButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  authorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  postDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  roleBadge: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  roleBadgeTxt: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
  },
  postContent: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 16,
  },
  commentsSection: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  commentsTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#6B7280',
    marginBottom: 8,
  },
  commentItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  commentDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  commentContent: {
    fontSize: 13,
    color: '#374151',
  },
  addCommentContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 13,
    backgroundColor: '#FAFAFA',
  },
  sendCommentBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    justifyContent: 'center',
  },
  sendCommentBtnTxt: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
