import logging
from typing import List, Dict, Any, Optional
import meilisearch

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SearchIndexer")

class SearchIndexer:
    """
    Meilisearch integration engine for sub-50ms typo-tolerant D2C Index queries.
    Handles index configuration, batch document insertion, and instant search execution.
    """
    def __init__(self, host: str = "http://127.0.0.1:7700", api_key: str = "masterKey"):
        self.host = host
        self.api_key = api_key
        self.index_name = "d2c_products"
        try:
            self.client = meilisearch.Client(self.host, self.api_key)
            self.index = self.client.index(self.index_name)
            self._configure_index()
        except Exception as e:
            logger.warning(f"Meilisearch offline or unreachable at {host}: {e}. Operating in fallback mode.")
            self.client = None
            self.index = None

    def _configure_index(self):
        """Sets up searchable, filterable, and sortable attribute rules."""
        if not self.index:
            return
        try:
            self.index.update_searchable_attributes([
                'title',
                'brand_name',
                'category',
                'specs'
            ])
            self.index.update_filterable_attributes([
                'brand_name',
                'category',
                'direct_price',
                'in_stock'
            ])
            self.index.update_sortable_attributes([
                'direct_price',
                'savings'
            ])
            logger.info("Meilisearch index rules configured successfully.")
        except Exception as e:
            logger.error(f"Error configuring Meilisearch index: {e}")

    def index_products(self, products: List[Dict[str, Any]]):
        """Batch inserts or updates products into the search index."""
        if not products:
            return
        if not self.index:
            logger.info(f"Fallback mode: Simulated indexing of {len(products)} products.")
            return
        try:
            task = self.index.add_documents(products)
            logger.info(f"💾 [Meilisearch] Indexed {len(products)} items. Task UID: {task.get('taskUid', 'N/A')}")
        except Exception as e:
            logger.error(f"Error pushing documents to Meilisearch: {e}")

    def query(self, search_text: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Executes instant search with typo-tolerance and highlighting."""
        if not self.index:
            return []
        try:
            results = self.index.search(search_text, {
                'limit': limit,
                'attributesToHighlight': ['title', 'brand_name']
            })
            return results.get('hits', [])
        except Exception as e:
            logger.error(f"Meilisearch search error: {e}")
            return []
