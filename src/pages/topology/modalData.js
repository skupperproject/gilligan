/*
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied.  See the License for the
specific language governing permissions and limitations
under the License.
*/

// diagram data used by traffic modal
let t1Requests = 3;
let t2Requests = 4;
let t1RequestSize = 400;
let t2RequestSize = 4000;

export const data = {
  sites: [
    {
      site_name: "s1",
      site_id: "site1id",
      connected: ["site2id"],
      namespace: "site1",
      url: "10.106.199.200",
      edge: false,
    },
    {
      site_name: "s2",
      site_id: "site2id",
      connected: ["site1id"],
      namespace: "site2",
      url: "10.106.199.201",
      edge: false,
    },
  ],
  services: [
    {
      address: "s",
      protocol: "http",
      targets: [
        {
          name: "s",
          site_id: "site1id",
        },
      ],
      requests_received: [],
      requests_handled: [],
    },
    {
      address: "t1",
      protocol: "http",
      targets: [
        {
          name: "t1",
          site_id: "site2id",
        },
      ],
      requests_received: [
        {
          site_id: "site1id",
          by_client: {
            s: {
              requests: t1Requests,
              bytes_in: 0,
              bytes_out: t1Requests * t1RequestSize,
              details: {
                "GET:200": t1Requests,
              },
              latency_max: 9,
              by_handling_site: {
                site2id: {
                  requests: t1Requests,
                  bytes_in: 0,
                  bytes_out: t1Requests * t1RequestSize,
                  details: {
                    "GET:200": t1Requests,
                  },
                  latency_max: 9,
                },
              },
            },
          },
        },
      ],
      requests_handled: [
        {
          site_id: "site2id",
          by_server: {
            t1: {
              requests: t1Requests,
              bytes_in: 0,
              bytes_out: t1Requests * t1RequestSize,
              details: {
                "GET:200": t1Requests,
              },
              latency_max: 3,
            },
          },
          by_originating_site: {
            site1id: {
              requests: t1Requests,
              bytes_in: 0,
              bytes_out: t1Requests * t1RequestSize,
              details: {
                "GET:200": t1Requests,
              },
              latency_max: 3,
            },
          },
        },
      ],
    },
    {
      address: "t2",
      protocol: "http",
      targets: [
        {
          name: "t2",
          site_id: "site2id",
        },
      ],
      requests_received: [
        {
          site_id: "site1id",
          by_client: {
            s: {
              requests: t2Requests,
              bytes_in: 0,
              bytes_out: t2Requests * t2RequestSize,
              details: {
                "GET:200": t2Requests,
              },
              latency_max: 9,
              by_handling_site: {
                site2id: {
                  requests: t2Requests,
                  bytes_in: 0,
                  bytes_out: t2Requests * t2RequestSize,
                  details: {
                    "GET:200": t2Requests,
                  },
                  latency_max: 9,
                },
              },
            },
          },
        },
      ],
      requests_handled: [
        {
          site_id: "site2id",
          by_server: {
            t2: {
              requests: t2Requests,
              bytes_in: 0,
              bytes_out: t2Requests * t2RequestSize,
              details: {
                "GET:200": t2Requests,
              },
              latency_max: 3,
            },
          },
          by_originating_site: {
            site1id: {
              requests: t2Requests,
              bytes_in: 0,
              bytes_out: t2Requests * t2RequestSize,
              details: {
                "GET:200": t2Requests,
              },
              latency_max: 3,
            },
          },
        },
      ],
    },
  ],
};
