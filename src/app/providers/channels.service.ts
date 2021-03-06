import { Injectable } from "@angular/core";
import { ApolloQueryResult } from "apollo-client";
import { TwitchService } from "./twitch.service";
import {
  GetGameStreamsGQL,
  GetTopStreamsGQL,
  GetCurrentUserOnlineFollowsGQL,
  TopStreamsResponse,
  GameStreamsResponse,
  FollowsResponse
} from "./twitch-graphql.service";
import { Game } from "./games.service";
import { map, find, union, concat, uniqBy } from "lodash";

export interface Stream {
  id: string;
  broadcaster: {
    id: string;
    displayName: string;
    login: string;
    broadcastSettings: {
      title: string;
      game: {
        id: string;
        name: string;
      }
    }

  };
  previewImageURL: string;
  viewersCount: number;
  createdAt: Date;
}
enum StreamListType {
  TopStreams,
  FollowingStreams,
  GameStreams
}

// Service that allows components to get channel list information
@Injectable()
export class ChannelService {
  private streams: Stream[] = [];
  private active_stream: Stream;
  private streams_list_type: StreamListType;
  private cursor = "";
  private game: Game;

  constructor(private twitchService: TwitchService,
    private getGameStreamsGQL: GetGameStreamsGQL,
    private getTopStreamsGQL: GetTopStreamsGQL,
    private getOnlineFollowsGQL: GetCurrentUserOnlineFollowsGQL) { }

  set currentStream(stream: Stream) {
    this.active_stream = stream;
  }

  get currentStream(): Stream {
    return this.active_stream;
  }

  getTopStreams() {
    return new Promise((resolve, reject) => {
      this.getTopStreamsGQL.fetch().subscribe((result: ApolloQueryResult<TopStreamsResponse>) => {
        if (result.data) {
          this.streams_list_type = StreamListType.TopStreams;
          this.cursor = result.data.streams.edges.slice(-1)[0].cursor;
          this.streams = map(result.data.streams.edges, (e) => {
            return e.node;
          });

          resolve(this.streams);
        } else {
          reject();
        }
      });
    });
  }

  getGameStreams(game: Game) {
    return new Promise((resolve, reject) => {
      this.getGameStreamsGQL.fetch({ name: game.name }).subscribe((result: ApolloQueryResult<GameStreamsResponse>) => {
        if (result.data) {
          this.game = game;
          this.streams_list_type = StreamListType.GameStreams;
          this.cursor = result.data.game.streams.edges.slice(-1)[0].cursor;
          this.streams = map(result.data.game.streams.edges, (e) => {
            return e.node;
          });

          resolve(this.streams);
        } else {
          reject();
        }
      });
    });
  }

  getFollowedStreams() {
    return new Promise((resolve, reject) => {
      this.getOnlineFollowsGQL.fetch().subscribe((result: ApolloQueryResult<FollowsResponse>) => {
        if (result.data) {
          this.streams_list_type = StreamListType.FollowingStreams;
          this.cursor = result.data.currentUser.followedLiveUsers.edges.slice(-1)[0].cursor;
          this.streams = map(result.data.currentUser.followedLiveUsers.edges, (e) => {
            return e.node.stream;
          });

          resolve(this.streams);
        } else {
          reject();
        }
      });
    });
  }

  fetchMoreStreams() {
    switch (this.streams_list_type) {
      case StreamListType.TopStreams:
        return this.fetchMoreTopStreams();
        break;

      case StreamListType.GameStreams:
        return this.fetchMoreGameStreams(this.game);
        break;

      case StreamListType.FollowingStreams:
        return this.fetchMoreFollowedStreams();
        break;
    }
  }

  private fetchMoreTopStreams() {
    return new Promise((resolve, reject) => {
      this.getTopStreamsGQL.fetch({ cursor: this.cursor }).subscribe((result: ApolloQueryResult<TopStreamsResponse>) => {
        if (result.data) {
          this.cursor = result.data.streams.edges.slice(-1)[0].cursor;
          this.streams = uniqBy(
            concat(
              this.streams,
              map(result.data.streams.edges, (e) => e.node)
            ),
            "id"
          );

          resolve(this.streams);
        } else {
          reject();
        }
      });
    });
  }

  private fetchMoreGameStreams(game: Game) {
    return new Promise((resolve, reject) => {
      this.getGameStreamsGQL.fetch({ name: game.name, cursor: this.cursor }).subscribe((result: ApolloQueryResult<GameStreamsResponse>) => {
        if (result.data) {
          this.cursor = result.data.game.streams.edges.slice(-1)[0].cursor;
          this.streams = uniqBy(
            concat(
              this.streams,
              map(result.data.game.streams.edges, (e) => e.node)
            ),
            "id"
          );

          resolve(this.streams);
        } else {
          reject();
        }
      });
    });
  }

  private fetchMoreFollowedStreams() {
    return new Promise((resolve, reject) => {
      this.getOnlineFollowsGQL.fetch({ cursor: this.cursor }).subscribe((result: ApolloQueryResult<FollowsResponse>) => {
        if (result.data) {
          this.cursor = result.data.currentUser.followedLiveUsers.edges.slice(-1)[0].cursor;
          this.streams = uniqBy(
            concat(
              this.streams,
              map(result.data.currentUser.followedLiveUsers.edges, (e) => e.node.stream)
            ),
            "id"
          );

          resolve(this.streams);
        } else {
          reject();
        }
      });
    });
  }
}
